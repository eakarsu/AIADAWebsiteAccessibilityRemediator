import { useState } from 'react';
import { FiX } from 'react-icons/fi';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function NewItemModal({ isOpen, onClose, apiPath, onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!title.trim()) errs.title = 'Title is required';
    if (!url.trim()) errs.url = 'URL is required';
    else if (!/^https?:\/\/.+/.test(url.trim())) errs.url = 'Enter a valid URL (http:// or https://)';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await api.post(apiPath, {
        title: title.trim(),
        description: description.trim(),
        url: url.trim(),
      });
      toast.success('Item created successfully!');
      onCreated(res.data);
      handleClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setUrl('');
    setErrors({});
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Item</h2>
          <button className="btn-icon" onClick={handleClose}>
            <FiX size={20} />
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="modal-title">Title *</label>
            <input
              id="modal-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Homepage Accessibility Scan"
              className={errors.title ? 'input-error' : ''}
            />
            {errors.title && <span className="error-text">{errors.title}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="modal-description">Description</label>
            <textarea
              id="modal-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="modal-url">URL *</label>
            <input
              id="modal-url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className={errors.url ? 'input-error' : ''}
            />
            {errors.url && <span className="error-text">{errors.url}</span>}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
