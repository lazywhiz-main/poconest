import React from 'react';

interface FormGroupProps {
  label?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

const FormGroup: React.FC<FormGroupProps> = ({ label, error, children, className }) => (
  <div className={`form-group${className ? ' ' + className : ''}`.trim()}>
    {label && <label className="form-label">{label}</label>}
    {children}
    {error && <div className="form-error">{error}</div>}
  </div>
);

export default FormGroup; 