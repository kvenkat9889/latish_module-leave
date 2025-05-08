const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// PostgreSQL connection configuration
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'leave_management',
    password: 'root',
    port: 5432,
});

// Validation middleware
const validateLeaveRequest = (req, res, next) => {
    const { name, employee_id, leave_type, start_date, end_date, comments } = req.body;
    
    if (!name || name.trim().length < 5 || !/^[A-Za-z\s]+$/.test(name)) {
        return res.status(400).json({ error: 'Name must be at least 5 alphabetical characters' });
    }
    
    if (!employee_id || !/^ATS0[0-9]{3}$/.test(employee_id)) {
        return res.status(400).json({ error: 'Invalid employee ID format (ATS0XXX)' });
    }
    
    if (!['vacational', 'sick', 'personal', 'casual', 'Maternity'].includes(leave_type)) {
        return res.status(400).json({ error: 'Invalid leave type' });
    }
    
    if (!start_date || !end_date || new Date(end_date) < new Date(start_date)) {
        return res.status(400).json({ error: 'Invalid date range' });
    }
    
    if (!comments || comments.trim().length < 10 || comments.trim().length > 300) {
        return res.status(400).json({ error: 'Comments must be 10-300 characters' });
    }
    
    next();
};

// API Endpoints

// Employee: Submit leave request
app.post('/api/leave-requests', validateLeaveRequest, async (req, res) => {
    const { name, employee_id, leave_type, start_date, end_date, comments } = req.body;
    
    try {
        // Check for duplicate requests
        const duplicateCheck = await pool.query(
            `SELECT * FROM leave_requests 
             WHERE employee_id = $1 
             AND status != 'rejected'
             AND ($2 <= end_date AND $3 >= start_date)`,
            [employee_id, start_date, end_date]
        );
        
        if (duplicateCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Duplicate leave request exists for these dates' });
        }
        
        const result = await pool.query(
            `INSERT INTO leave_requests (name, employee_id, leave_type, start_date, end_date, comments)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [name, employee_id, leave_type, start_date, end_date, comments]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error submitting leave request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// HR: Get all leave requests
app.get('/api/leave-requests', async (req, res) => {
    const { status, employee_id } = req.query;
    
    try {
        let query = 'SELECT * FROM leave_requests';
        let params = [];
        let conditions = [];
        
        if (status) {
            conditions.push(`status = $${params.length + 1}`);
            params.push(status);
        }
        
        if (employee_id) {
            conditions.push(`employee_id = $${params.length + 1}`);
            params.push(employee_id);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ' ORDER BY created_at DESC';
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching leave requests:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// HR: Get single leave request
app.get('/api/leave-requests/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await pool.query(
            'SELECT * FROM leave_requests WHERE id = $1',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Leave request not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching leave request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// HR: Update leave request status
app.put('/api/leave-requests/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    
    try {
        const result = await pool.query(
            'UPDATE leave_requests SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Leave request not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating leave request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// HR: Delete leave requests
app.delete('/api/leave-requests', async (req, res) => {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'No records selected for deletion' });
    }
    
    try {
        const result = await pool.query(
            'DELETE FROM leave_requests WHERE id = ANY($1) RETURNING *',
            [ids]
        );
        
        res.json({ message: `${result.rowCount} record(s) deleted successfully` });
    } catch (error) {
        console.error('Error deleting leave requests:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});