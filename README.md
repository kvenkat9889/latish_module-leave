CREATE DATABASE leave_management;

-- Create leave_requests table
CREATE TABLE IF NOT EXISTS leave_requests (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    employee_id VARCHAR(7) NOT NULL,
    leave_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    comments TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_employee_id CHECK (employee_id ~ '^ATS0[0-9]{3}$'),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected'))
);
