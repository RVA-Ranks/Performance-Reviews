/**
 * V31 Compensation CAF PDF generation.
 *
 * Final PDF is created once after Manager, Employee, and HR PR signatures exist.
 * History is appended exactly once after the sealed PDF ID is persisted.
 */

function maybeGenerateCompensationPdfAfterSignatures_(cycleId) {
  ensureCompensationDataModel_();
  const cycle = findCycle_(cycleId).object;
  const decision = normalizeCompensationDecision_(
    cycle['Compensation Decision']
  );
  if (decision !== V31.COMPENSATION.ADJUSTMENT) {
    return { skipped: true, reason: 'no-adjustment' };
  }

  const signatures = getCombinedSignatureState_(cycle);
  if (
    !signatures.managerSigned ||
    !signatures.employeeSigned ||
    !signatures.hrSigned
  ) {
    return { skipped: true, reason: 'signatures-incomplete' };
  }

  return ensureCompensationCafPdf_(cycleId);
}

function ensureCompensationCafPdf_(cycleId) {
  const claimed = withLock_(function () {
    const recordLoc = findCompensationRecordByCycle_(cycleId);
    const record = recordLoc.object;
    const status = String(record['Status'] || '');
    const pdfStatus = String(
      record['CAF PDF Status'] || V31_COMP.PDF.PENDING
    );

    if (
      status === V31_COMP.STATUS.COMPLETE &&
      pdfStatus === V31_COMP.PDF.COMPLETE &&
      String(record['CAF Final PDF ID'] || '')
    ) {
      return { skip: true, alreadyComplete: true, record: record };
    }

    if (
      status !== V31_COMP.STATUS.AWAITING_SIGNATURES &&
      status !== V31_COMP.STATUS.COMPLETE
    ) {
      throw new Error(
        'Compensation CAF PDF can only be generated after the owner decision.'
      );
    }

    const cycle = findCycle_(cycleId).object;
    const signatures = getCombinedSignatureState_(cycle);
    if (
      !signatures.managerSigned ||
      !signatures.employeeSigned ||
      !signatures.hrSigned
    ) {
      throw new Error(
        'Compensation CAF PDF requires manager, employee, and HR signatures.'
      );
    }

    if (pdfStatus === V31_COMP.PDF.GENERATING) {
      if (isDeliveryClaimStale_(record['CAF PDF Started At'])) {
        record['CAF PDF Status'] = V31_COMP.PDF.UNKNOWN;
        record['CAF PDF Last Error'] =
          'CAF PDF claim went stale before an ID was persisted.';
        record['Updated At'] = new Date();
        writeCompensationRecord_(recordLoc.rowNumber, record);
        throw new Error(
          'Compensation CAF PDF is Delivery Unknown and requires HR recovery.'
        );
      }
      throw new Error('Compensation CAF PDF generation is already in progress.');
    }

    if (pdfStatus === V31_COMP.PDF.UNKNOWN) {
      throw new Error(
        'Compensation CAF PDF is Delivery Unknown. HR must reconcile before retry.'
      );
    }

    if (pdfStatus === V31_COMP.PDF.COMPLETE && record['CAF Final PDF ID']) {
      return { skip: true, alreadyComplete: true, record: record };
    }

    const attemptId = Utilities.getUuid();
    record['CAF PDF Status'] = V31_COMP.PDF.GENERATING;
    record['CAF PDF Attempt ID'] = attemptId;
    record['CAF PDF Started At'] = new Date();
    record['CAF PDF Last Error'] = '';
    record['Updated At'] = new Date();
    writeCompensationRecord_(recordLoc.rowNumber, record);
    SpreadsheetApp.flush();

    return {
      skip: false,
      attemptId: attemptId,
      recordId: String(record['Compensation Record ID']),
    };
  });

  if (claimed.skip) {
    return {
      ok: true,
      alreadyComplete: true,
      pdfId: String(claimed.record['CAF Final PDF ID'] || ''),
    };
  }

  try {
    const pdfId = generateCompensationCafPdf_(cycleId);
    return withLock_(function () {
      const recordLoc = findCompensationRecordByCycle_(cycleId);
      const record = recordLoc.object;
      if (
        String(record['CAF PDF Attempt ID'] || '') !==
        String(claimed.attemptId)
      ) {
        return { ok: false, superseded: true };
      }

      record['CAF Final PDF ID'] = pdfId;
      record['CAF Final PDF Created At'] = new Date();
      record['CAF PDF Status'] = V31_COMP.PDF.COMPLETE;
      record['CAF PDF Attempt ID'] = '';
      record['CAF PDF Started At'] = '';
      record['CAF PDF Last Error'] = '';
      record['Status'] = V31_COMP.STATUS.COMPLETE;
      record['Updated At'] = new Date();

      const effective = v31Date_(record['Compensation Effective Date']);
      const today = v31Today_();
      if (effective && effective.getTime() > today.getTime()) {
        record['Rate Update Status'] =
          V31_COMP.RATE_UPDATE.PENDING_EFFECTIVE;
      } else {
        record['Rate Update Status'] = V31_COMP.RATE_UPDATE.PENDING;
      }

      writeCompensationRecord_(recordLoc.rowNumber, record);

      const cycleLoc = findCycle_(cycleId);
      const cycle = cycleLoc.object;
      syncCycleCompensationSummary_(cycle, record);
      cycle['Updated At'] = new Date();
      writeCycle_(cycleLoc.rowNumber, cycle);

      appendCompensationHistoryOnce_(
        record,
        Session.getEffectiveUser().getEmail()
      );
      SpreadsheetApp.flush();

      audit_(
        cycleId,
        'Compensation CAF PDF sealed',
        Session.getEffectiveUser().getEmail(),
        V31_COMP.STATUS.AWAITING_SIGNATURES,
        V31_COMP.STATUS.COMPLETE,
        JSON.stringify({
          compensationRecordId: record['Compensation Record ID'],
          pdfId: pdfId,
        })
      );

      return { ok: true, pdfId: pdfId, sealed: true };
    });
  } catch (error) {
    withLock_(function () {
      const recordLoc = findCompensationRecordByCycle_(cycleId);
      const record = recordLoc.object;
      if (
        String(record['CAF PDF Attempt ID'] || '') !==
        String(claimed.attemptId)
      ) {
        return;
      }
      record['CAF PDF Status'] = V31_COMP.PDF.FAILED;
      record['CAF PDF Last Error'] = String(error.message || error);
      record['CAF PDF Attempt ID'] = '';
      record['CAF PDF Started At'] = '';
      record['Updated At'] = new Date();
      writeCompensationRecord_(recordLoc.rowNumber, record);
    });
    throw error;
  }
}

function generateCompensationCafPdf_(cycleId) {
  const cycle = findCycle_(cycleId).object;
  const record = findCompensationRecordByCycle_(cycleId).object;
  const settings = getSettings_();
  const folderId = String(settings.COMPENSATION_FOLDER_ID || '').trim();
  if (!folderId) {
    throw new Error(
      'COMPENSATION_FOLDER_ID is not configured. HR must set the compensation Drive folder.'
    );
  }

  const folder = DriveApp.getFolderById(folderId);
  const fileName =
    'AITHERAS_' + cycleId + '_Compensation_Adjustment_FINAL.pdf';

  const existing = folder.getFilesByName(fileName);
  while (existing.hasNext()) {
    const file = existing.next();
    if (file.getMimeType() === MimeType.PDF) {
      return file.getId();
    }
  }

  const doc = DocumentApp.create(
    'AITHERAS_' + cycleId + '_Compensation_Adjustment_WORKING'
  );
  const body = doc.getBody();
  body.clear();

  body
    .appendParagraph('AITHERAS')
    .setHeading(DocumentApp.ParagraphHeading.TITLE)
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body
    .appendParagraph('Compensation Adjustment Agreement')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1)
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body
    .appendParagraph('Review Cycle ID: ' + cycleId)
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendHorizontalRule();

  const identity = body.appendTable([
    ['Employee', String(record['Employee Name'] || '')],
    ['Employee Email', String(record['Employee Email'] || '')],
    ['Manager', String(record['Manager Name'] || '')],
    ['Job Title', String(cycle['Employee Job Title'] || '')],
    ['Department / Project', String(cycle['Department / Project'] || '')],
  ]);
  styleInfoTable_(identity);

  body
    .appendParagraph('Current Compensation')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  const currentTable = body.appendTable([
    [
      'Current Pay Rate',
      formatMoney_(Number(record['Original Pay Rate'] || 0)),
    ],
    [
      'Current Annual Salary',
      formatMoney_(Number(record['Original Annual Salary'] || 0)),
    ],
  ]);
  styleInfoTable_(currentTable);

  body
    .appendParagraph('Manager Recommendation')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  const recommendationTable = body.appendTable([
    [
      'Recommended Pay Rate',
      formatMoney_(Number(record['Manager Recommended Pay Rate'] || 0)),
    ],
    [
      'Recommended Annual Salary',
      formatMoney_(
        Number(record['Manager Recommended Annual Salary'] || 0)
      ),
    ],
    [
      'Recommended Increase',
      formatPercentDisplay_(
        Number(record['Manager Recommended Percent'] || 0)
      ),
    ],
    [
      'Proposed Effective Date',
      formatDate_(record['Manager Proposed Effective Date']) || '',
    ],
    [
      'Submitted By',
      String(record['Manager Recommendation Submitted By'] || ''),
    ],
    [
      'Submitted At',
      formatDateTime_(record['Manager Recommendation Submitted At']) || '',
    ],
  ]);
  styleInfoTable_(recommendationTable);

  body
    .appendParagraph('Final Approved Compensation')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  const finalTable = body.appendTable([
    [
      'Final Approved Pay Rate',
      formatMoney_(Number(record['Final Approved Pay Rate'] || 0)),
    ],
    [
      'Final Approved Annual Salary',
      formatMoney_(Number(record['Final Approved Annual Salary'] || 0)),
    ],
    [
      'Final Approved Increase',
      formatPercentDisplay_(Number(record['Final Approved Percent'] || 0)),
    ],
    [
      'Recommendation Accepted',
      String(record['Recommendation Accepted'] || ''),
    ],
    [
      'Effective Date',
      formatDate_(record['Compensation Effective Date']) || '',
    ],
  ]);
  styleInfoTable_(finalTable);

  body
    .appendParagraph('Owner Decision')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  const ownerTable = body.appendTable([
    ['Approved by', String(record['Owner Name'] || '')],
    [
      'Decision recorded by',
      String(record['Owner Decision Recorded By'] || ''),
    ],
    [
      'Decision date',
      formatDateTime_(record['Owner Decision At']) || '',
    ],
    ['Decision notes', String(record['Owner Decision Notes'] || '')],
  ]);
  styleInfoTable_(ownerTable);

  body
    .appendParagraph('Signatures')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  appendCompensationSignatureBlock_(
    body,
    'Manager',
    String(cycle['Manager Name'] || ''),
    String(cycle['Manager Signature File ID'] || ''),
    cycle['Manager Signed At']
  );
  appendCompensationSignatureBlock_(
    body,
    'Employee',
    String(cycle['Employee Name'] || ''),
    String(cycle['Employee Signature File ID'] || ''),
    cycle['Employee Signed At']
  );
  appendCompensationSignatureBlock_(
    body,
    'HR',
    String(cycle['HR Name'] || ''),
    String(cycle['HR Signature File ID'] || ''),
    cycle['HR Signed At']
  );

  body.appendParagraph('');
  body.appendParagraph(
    'By signing, the employee acknowledges receipt of the approved compensation adjustment shown above.'
  );

  doc.saveAndClose();

  const docFile = DriveApp.getFileById(doc.getId());
  const pdfBlob = docFile.getAs(MimeType.PDF).setName(fileName);
  const pdfFile = folder.createFile(pdfBlob);
  docFile.setTrashed(true);

  return pdfFile.getId();
}

function appendCompensationSignatureBlock_(
  body,
  role,
  name,
  fileId,
  signedAt
) {
  body.appendParagraph(role + ' Signature');
  body.appendParagraph(name || '');
  body.appendParagraph(
    'Signed At: ' + (formatDateTime_(signedAt) || 'Not Recorded')
  );
  if (fileId) {
    try {
      const blob = DriveApp.getFileById(String(fileId)).getBlob();
      body.appendImage(blob).setWidth(220);
    } catch (error) {
      body.appendParagraph(
        '[Signature image unavailable: ' + String(error.message || error) + ']'
      );
    }
  } else {
    body.appendParagraph('[Signature image missing]');
  }
  body.appendParagraph('');
}

function formatMoney_(value) {
  const amount = Number(value || 0);
  return (
    '$' +
    amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function formatPercentDisplay_(fraction) {
  return (
    (Math.round(Number(fraction || 0) * 10000) / 100).toFixed(2) + '%'
  );
}

function recoverCompensationCafPdf_(cycleId) {
  const email = getCurrentUserEmail_();
  if (!isHrUser_(email)) {
    throw new Error('Only HR may recover compensation CAF PDFs.');
  }
  return ensureCompensationCafPdf_(cycleId);
}
