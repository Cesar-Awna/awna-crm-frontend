import instance from '../apis/app.js';

class LeadDocumentsService {
  getByLeadId = (leadId) => instance.get(`/api/lead-documents/lead/${leadId}`);

  getSignedUrl = (documentId, params = {}) =>
    instance.get(`/api/lead-documents/${documentId}/signed-url`, { params });

  delete = (documentId) => instance.delete(`/api/lead-documents/${documentId}`);

  upload = ({ leadId, file, docType = 'OTHER', metadata } = {}) => {
    const form = new FormData();
    form.append('leadId', leadId);
    form.append('docType', docType);
    form.append('file', file);
    if (metadata !== undefined) {
      form.append('metadata', typeof metadata === 'string' ? metadata : JSON.stringify(metadata));
    }
    return instance.post('/api/lead-documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  };
}

const LeadDocuments = new LeadDocumentsService();
export default LeadDocuments;

