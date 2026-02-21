// src/routes/support.routes.js
const express = require('express');
const router = express.Router();
const supportController = require('../controllers/support.controller');
const { protect } = require('../controllers/auth.controller');
const { restrictTo } = require('../controllers/auth.controller');
const { uploadImages } = require('../middleware/upload.middleware');
const { handleMulterError } = require('../middleware/upload.middleware');

// ==================== PUBLIC ROUTES ====================

// @route   GET /api/v1/support/categories
// @desc    Get all support ticket categories
// @access  Public
router.get('/categories', supportController.getTicketCategories);

// @route   GET /api/v1/support/faq
// @desc    Get frequently asked questions
// @access  Public
router.get('/faq', supportController.getFAQ);

// @route   GET /api/v1/support/status/:ticketId
// @desc    Check ticket status without authentication (using ticket ID)
// @access  Public
router.get('/status/:ticketId', supportController.checkTicketStatus);

// ==================== PROTECTED ROUTES (Customer) ====================

// @route   POST /api/v1/support/tickets
// @desc    Create a new support ticket
// @access  Private
router.post('/tickets', 
  protect, 
  uploadImages, 
  handleMulterError, 
  supportController.createTicket
);

// @route   GET /api/v1/support/tickets
// @desc    Get all tickets for current user
// @access  Private
router.get('/tickets', protect, supportController.getUserTickets);

// @route   GET /api/v1/support/tickets/:ticketId
// @desc    Get specific ticket details
// @access  Private
router.get('/tickets/:ticketId', protect, supportController.getTicketById);

// @route   PUT /api/v1/support/tickets/:ticketId
// @desc    Update ticket (customer can only update their own)
// @access  Private
router.put('/tickets/:ticketId', protect, supportController.updateTicket);

// @route   POST /api/v1/support/tickets/:ticketId/message
// @desc    Add a message/reply to a ticket
// @access  Private
router.post('/tickets/:ticketId/message', 
  protect, 
  uploadImages, 
  handleMulterError, 
  supportController.addMessage
);

// @route   POST /api/v1/support/tickets/:ticketId/close
// @desc    Close a ticket (customer initiated)
// @access  Private
router.post('/tickets/:ticketId/close', protect, supportController.closeTicket);

// @route   POST /api/v1/support/tickets/:ticketId/reopen
// @desc    Reopen a closed ticket
// @access  Private
router.post('/tickets/:ticketId/reopen', protect, supportController.reopenTicket);

// @route   DELETE /api/v1/support/tickets/:ticketId
// @desc    Delete a ticket (customer can only delete their own)
// @access  Private
router.delete('/tickets/:ticketId', protect, supportController.deleteTicket);

// @route   POST /api/v1/support/tickets/:ticketId/satisfaction
// @desc    Submit satisfaction rating for a resolved ticket
// @access  Private
router.post('/tickets/:ticketId/satisfaction', protect, supportController.submitSatisfaction);

// @route   GET /api/v1/support/tickets/:ticketId/attachments
// @desc    Get all attachments for a ticket
// @access  Private
router.get('/tickets/:ticketId/attachments', protect, supportController.getTicketAttachments);

// @route   GET /api/v1/support/tickets/:ticketId/download/:attachmentId
// @desc    Download a specific attachment from a ticket
// @access  Private
router.get('/tickets/:ticketId/download/:attachmentId', protect, supportController.downloadAttachment);

// ==================== TICKET MANAGEMENT ROUTES ====================

// @route   GET /api/v1/support/tickets/:ticketId/messages
// @desc    Get all messages for a ticket
// @access  Private
router.get('/tickets/:ticketId/messages', protect, supportController.getTicketMessages);

// @route   PUT /api/v1/support/tickets/:ticketId/messages/:messageId
// @desc    Edit a message (within 15 minutes of posting)
// @access  Private
router.put('/tickets/:ticketId/messages/:messageId', protect, supportController.editMessage);

// @route   DELETE /api/v1/support/tickets/:ticketId/messages/:messageId
// @desc    Delete a message (within 15 minutes of posting)
// @access  Private
router.delete('/tickets/:ticketId/messages/:messageId', protect, supportController.deleteMessage);

// @route   POST /api/v1/support/tickets/:ticketId/subscribe
// @desc    Subscribe to ticket notifications
// @access  Private
router.post('/tickets/:ticketId/subscribe', protect, supportController.subscribeToTicket);

// @route   POST /api/v1/support/tickets/:ticketId/unsubscribe
// @desc    Unsubscribe from ticket notifications
// @access  Private
router.post('/tickets/:ticketId/unsubscribe', protect, supportController.unsubscribeFromTicket);

// @route   GET /api/v1/support/tickets/:ticketId/subscribers
// @desc    Get all subscribers of a ticket
// @access  Private
router.get('/tickets/:ticketId/subscribers', protect, supportController.getTicketSubscribers);

// ==================== SEARCH & FILTER ROUTES ====================

// @route   GET /api/v1/support/tickets/search
// @desc    Search tickets by keyword
// @access  Private
router.get('/tickets/search', protect, supportController.searchTickets);

// @route   GET /api/v1/support/tickets/filter
// @desc    Filter tickets by status, category, priority, etc.
// @access  Private
router.get('/tickets/filter', protect, supportController.filterTickets);

// @route   GET /api/v1/support/tickets/sort
// @desc    Sort tickets by various criteria
// @access  Private
router.get('/tickets/sort', protect, supportController.sortTickets);

// @route   GET /api/v1/support/tickets/paginated
// @desc    Get paginated tickets list
// @access  Private
router.get('/tickets/paginated', protect, supportController.getPaginatedTickets);

// ==================== STAFF ROUTES ====================

// @route   GET /api/v1/support/staff/tickets
// @desc    Get all tickets assigned to staff member
// @access  Private/Staff
router.get('/staff/tickets', protect, restrictTo('staff', 'admin'), supportController.getStaffTickets);

// @route   GET /api/v1/support/staff/tickets/unassigned
// @desc    Get all unassigned tickets
// @access  Private/Staff
router.get('/staff/tickets/unassigned', protect, restrictTo('staff', 'admin'), supportController.getUnassignedTickets);

// @route   POST /api/v1/support/staff/tickets/:ticketId/assign
// @desc    Assign a ticket to a staff member
// @access  Private/Staff
router.post('/staff/tickets/:ticketId/assign', protect, restrictTo('staff', 'admin'), supportController.assignTicket);

// @route   POST /api/v1/support/staff/tickets/:ticketId/claim
// @desc    Claim a ticket for yourself
// @access  Private/Staff
router.post('/staff/tickets/:ticketId/claim', protect, restrictTo('staff', 'admin'), supportController.claimTicket);

// @route   POST /api/v1/support/staff/tickets/:ticketId/unassign
// @desc    Unassign a ticket
// @access  Private/Staff
router.post('/staff/tickets/:ticketId/unassign', protect, restrictTo('staff', 'admin'), supportController.unassignTicket);

// @route   PUT /api/v1/support/staff/tickets/:ticketId/status
// @desc    Update ticket status (staff only)
// @access  Private/Staff
router.put('/staff/tickets/:ticketId/status', protect, restrictTo('staff', 'admin'), supportController.updateTicketStatus);

// @route   PUT /api/v1/support/staff/tickets/:ticketId/priority
// @desc    Update ticket priority (staff only)
// @access  Private/Staff
router.put('/staff/tickets/:ticketId/priority', protect, restrictTo('staff', 'admin'), supportController.updateTicketPriority);

// @route   PUT /api/v1/support/staff/tickets/:ticketId/category
// @desc    Update ticket category (staff only)
// @access  Private/Staff
router.put('/staff/tickets/:ticketId/category', protect, restrictTo('staff', 'admin'), supportController.updateTicketCategory);

// @route   POST /api/v1/support/staff/tickets/:ticketId/resolve
// @desc    Resolve a ticket (staff only)
// @access  Private/Staff
router.post('/staff/tickets/:ticketId/resolve', protect, restrictTo('staff', 'admin'), supportController.resolveTicket);

// @route   POST /api/v1/support/staff/tickets/:ticketId/close
// @desc    Close a ticket (staff only)
// @access  Private/Staff
router.post('/staff/tickets/:ticketId/close', protect, restrictTo('staff', 'admin'), supportController.closeTicketAsStaff);

// @route   POST /api/v1/support/staff/tickets/:ticketId/internal-note
// @desc    Add internal note (visible only to staff)
// @access  Private/Staff
router.post('/staff/tickets/:ticketId/internal-note', 
  protect, 
  restrictTo('staff', 'admin'), 
  supportController.addInternalNote
);

// @route   GET /api/v1/support/staff/tickets/:ticketId/internal-notes
// @desc    Get all internal notes for a ticket
// @access  Private/Staff
router.get('/staff/tickets/:ticketId/internal-notes', protect, restrictTo('staff', 'admin'), supportController.getInternalNotes);

// @route   PUT /api/v1/support/staff/tickets/:ticketId/internal-note/:noteId
// @desc    Edit an internal note
// @access  Private/Staff
router.put('/staff/tickets/:ticketId/internal-note/:noteId', protect, restrictTo('staff', 'admin'), supportController.editInternalNote);

// @route   DELETE /api/v1/support/staff/tickets/:ticketId/internal-note/:noteId
// @desc    Delete an internal note
// @access  Private/Staff
router.delete('/staff/tickets/:ticketId/internal-note/:noteId', protect, restrictTo('staff', 'admin'), supportController.deleteInternalNote);

// @route   POST /api/v1/support/staff/tickets/:ticketId/merge
// @desc    Merge two tickets into one
// @access  Private/Staff
router.post('/staff/tickets/:ticketId/merge', protect, restrictTo('staff', 'admin'), supportController.mergeTickets);

// @route   POST /api/v1/support/staff/tickets/:ticketId/split
// @desc    Split a ticket into multiple tickets
// @access  Private/Staff
router.post('/staff/tickets/:ticketId/split', protect, restrictTo('staff', 'admin'), supportController.splitTicket);

// @route   POST /api/v1/support/staff/tickets/:ticketId/escalate
// @desc    Escalate a ticket to higher priority or different department
// @access  Private/Staff
router.post('/staff/tickets/:ticketId/escalate', protect, restrictTo('staff', 'admin'), supportController.escalateTicket);

// @route   POST /api/v1/support/staff/tickets/:ticketId/transfer
// @desc    Transfer a ticket to another staff member
// @access  Private/Staff
router.post('/staff/tickets/:ticketId/transfer', protect, restrictTo('staff', 'admin'), supportController.transferTicket);

// @route   GET /api/v1/support/staff/tickets/:ticketId/activity-log
// @desc    Get activity log for a ticket
// @access  Private/Staff
router.get('/staff/tickets/:ticketId/activity-log', protect, restrictTo('staff', 'admin'), supportController.getActivityLog);

// ==================== ADMIN ROUTES ====================

// @route   GET /api/v1/support/admin/tickets
// @desc    Get all tickets (Admin only)
// @access  Private/Admin
router.get('/admin/tickets', protect, restrictTo('admin'), supportController.getAllTickets);

// @route   GET /api/v1/support/admin/stats
// @desc    Get global support statistics (Admin only)
// @access  Private/Admin
router.get('/admin/stats', protect, restrictTo('admin'), supportController.getGlobalStats);

// @route   GET /api/v1/support/admin/stats/overview
// @desc    Get overview dashboard statistics (Admin only)
// @access  Private/Admin
router.get('/admin/stats/overview', protect, restrictTo('admin'), supportController.getDashboardStats);

// @route   GET /api/v1/support/admin/stats/staff-performance
// @desc    Get staff performance statistics (Admin only)
// @access  Private/Admin
router.get('/admin/stats/staff-performance', protect, restrictTo('admin'), supportController.getStaffPerformanceStats);

// @route   GET /api/v1/support/admin/stats/trends
// @desc    Get ticket trends over time (Admin only)
// @access  Private/Admin
router.get('/admin/stats/trends', protect, restrictTo('admin'), supportController.getTicketTrends);

// @route   GET /api/v1/support/admin/overdue
// @desc    Get all overdue tickets (Admin only)
// @access  Private/Admin
router.get('/admin/overdue', protect, restrictTo('admin'), supportController.getOverdueTickets);

// @route   GET /api/v1/support/admin/high-priority
// @desc    Get all high priority tickets (Admin only)
// @access  Private/Admin
router.get('/admin/high-priority', protect, restrictTo('admin'), supportController.getHighPriorityTickets);

// @route   GET /api/v1/support/admin/unresolved
// @desc    Get all unresolved tickets (Admin only)
// @access  Private/Admin
router.get('/admin/unresolved', protect, restrictTo('admin'), supportController.getUnresolvedTickets);

// @route   GET /api/v1/support/admin/staff/:staffId
// @desc    Get all tickets assigned to a specific staff member (Admin only)
// @access  Private/Admin
router.get('/admin/staff/:staffId', protect, restrictTo('admin'), supportController.getTicketsByStaff);

// @route   GET /api/v1/support/admin/user/:userId
// @desc    Get all tickets from a specific user (Admin only)
// @access  Private/Admin
router.get('/admin/user/:userId', protect, restrictTo('admin'), supportController.getTicketsByUser);

// @route   DELETE /api/v1/support/admin/tickets/:ticketId
// @desc    Permanently delete a ticket (Admin only)
// @access  Private/Admin
router.delete('/admin/tickets/:ticketId', protect, restrictTo('admin'), supportController.deleteTicketAsAdmin);

// @route   POST /api/v1/support/admin/tickets/bulk-update
// @desc    Bulk update multiple tickets (Admin only)
// @access  Private/Admin
router.post('/admin/tickets/bulk-update', protect, restrictTo('admin'), supportController.bulkUpdateTickets);

// @route   POST /api/v1/support/admin/tickets/bulk-delete
// @desc    Bulk delete multiple tickets (Admin only)
// @access  Private/Admin
router.post('/admin/tickets/bulk-delete', protect, restrictTo('admin'), supportController.bulkDeleteTickets);

// @route   POST /api/v1/support/admin/tickets/bulk-assign
// @desc    Bulk assign multiple tickets to staff (Admin only)
// @access  Private/Admin
router.post('/admin/tickets/bulk-assign', protect, restrictTo('admin'), supportController.bulkAssignTickets);

// @route   GET /api/v1/support/admin/categories
// @desc    Manage ticket categories (Admin only)
// @access  Private/Admin
router.get('/admin/categories', protect, restrictTo('admin'), supportController.getAllCategories);

// @route   POST /api/v1/support/admin/categories
// @desc    Create a new ticket category (Admin only)
// @access  Private/Admin
router.post('/admin/categories', protect, restrictTo('admin'), supportController.createCategory);

// @route   PUT /api/v1/support/admin/categories/:categoryId
// @desc    Update a ticket category (Admin only)
// @access  Private/Admin
router.put('/admin/categories/:categoryId', protect, restrictTo('admin'), supportController.updateCategory);

// @route   DELETE /api/v1/support/admin/categories/:categoryId
// @desc    Delete a ticket category (Admin only)
// @access  Private/Admin
router.delete('/admin/categories/:categoryId', protect, restrictTo('admin'), supportController.deleteCategory);

// @route   GET /api/v1/support/admin/tags
// @desc    Manage ticket tags (Admin only)
// @access  Private/Admin
router.get('/admin/tags', protect, restrictTo('admin'), supportController.getAllTags);

// @route   POST /api/v1/support/admin/tags
// @desc    Create a new tag (Admin only)
// @access  Private/Admin
router.post('/admin/tags', protect, restrictTo('admin'), supportController.createTag);

// @route   DELETE /api/v1/support/admin/tags/:tagId
// @desc    Delete a tag (Admin only)
// @access  Private/Admin
router.delete('/admin/tags/:tagId', protect, restrictTo('admin'), supportController.deleteTag);

// @route   POST /api/v1/support/admin/tags/:ticketId
// @desc    Add tags to a ticket (Admin only)
// @access  Private/Admin
router.post('/admin/tags/:ticketId', protect, restrictTo('admin'), supportController.addTagsToTicket);

// @route   DELETE /api/v1/support/admin/tags/:ticketId/:tagId
// @desc    Remove a tag from a ticket (Admin only)
// @access  Private/Admin
router.delete('/admin/tags/:ticketId/:tagId', protect, restrictTo('admin'), supportController.removeTagFromTicket);

// ==================== REPORTS & ANALYTICS ====================

// @route   GET /api/v1/support/reports/daily
// @desc    Get daily support report (Admin only)
// @access  Private/Admin
router.get('/reports/daily', protect, restrictTo('admin'), supportController.getDailyReport);

// @route   GET /api/v1/support/reports/weekly
// @desc    Get weekly support report (Admin only)
// @access  Private/Admin
router.get('/reports/weekly', protect, restrictTo('admin'), supportController.getWeeklyReport);

// @route   GET /api/v1/support/reports/monthly
// @desc    Get monthly support report (Admin only)
// @access  Private/Admin
router.get('/reports/monthly', protect, restrictTo('admin'), supportController.getMonthlyReport);

// @route   GET /api/v1/support/reports/custom
// @desc    Get custom date range report (Admin only)
// @access  Private/Admin
router.get('/reports/custom', protect, restrictTo('admin'), supportController.getCustomReport);

// @route   GET /api/v1/support/reports/export
// @desc    Export support data as CSV/Excel (Admin only)
// @access  Private/Admin
router.get('/reports/export', protect, restrictTo('admin'), supportController.exportReport);

// @route   GET /api/v1/support/reports/satisfaction
// @desc    Get customer satisfaction report (Admin only)
// @access  Private/Admin
router.get('/reports/satisfaction', protect, restrictTo('admin'), supportController.getSatisfactionReport);

// @route   GET /api/v1/support/reports/response-time
// @desc    Get average response time report (Admin only)
// @access  Private/Admin
router.get('/reports/response-time', protect, restrictTo('admin'), supportController.getResponseTimeReport);

// @route   GET /api/v1/support/reports/resolution-time
// @desc    Get average resolution time report (Admin only)
// @access  Private/Admin
router.get('/reports/resolution-time', protect, restrictTo('admin'), supportController.getResolutionTimeReport);

// ==================== NOTIFICATIONS ====================

// @route   GET /api/v1/support/notifications
// @desc    Get all notifications for current user
// @access  Private
router.get('/notifications', protect, supportController.getNotifications);

// @route   PUT /api/v1/support/notifications/:notificationId/read
// @desc    Mark a notification as read
// @access  Private
router.put('/notifications/:notificationId/read', protect, supportController.markNotificationAsRead);

// @route   PUT /api/v1/support/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/notifications/read-all', protect, supportController.markAllNotificationsAsRead);

// @route   DELETE /api/v1/support/notifications/:notificationId
// @desc    Delete a notification
// @access  Private
router.delete('/notifications/:notificationId', protect, supportController.deleteNotification);

// @route   GET /api/v1/support/notifications/unread-count
// @desc    Get count of unread notifications
// @access  Private
router.get('/notifications/unread-count', protect, supportController.getUnreadNotificationsCount);

// ==================== SLA & AUTOMATION ====================

// @route   GET /api/v1/support/sla/settings
// @desc    Get SLA settings (Admin only)
// @access  Private/Admin
router.get('/sla/settings', protect, restrictTo('admin'), supportController.getSLASettings);

// @route   PUT /api/v1/support/sla/settings
// @desc    Update SLA settings (Admin only)
// @access  Private/Admin
router.put('/sla/settings', protect, restrictTo('admin'), supportController.updateSLASettings);

// @route   GET /api/v1/support/sla/violations
// @desc    Get SLA violations (Admin only)
// @access  Private/Admin
router.get('/sla/violations', protect, restrictTo('admin'), supportController.getSLAViolations);

// @route   POST /api/v1/support/sla/violations/:ticketId/excuse
// @desc    Add excuse for SLA violation (Admin only)
// @access  Private/Admin
router.post('/sla/violations/:ticketId/excuse', protect, restrictTo('admin'), supportController.addSLAViolationExcuse);

// ==================== CANNED RESPONSES (Staff) ====================

// @route   GET /api/v1/support/canned-responses
// @desc    Get all canned responses (Staff only)
// @access  Private/Staff
router.get('/canned-responses', protect, restrictTo('staff', 'admin'), supportController.getCannedResponses);

// @route   POST /api/v1/support/canned-responses
// @desc    Create a new canned response (Staff only)
// @access  Private/Staff
router.post('/canned-responses', protect, restrictTo('staff', 'admin'), supportController.createCannedResponse);

// @route   PUT /api/v1/support/canned-responses/:responseId
// @desc    Update a canned response (Staff only)
// @access  Private/Staff
router.put('/canned-responses/:responseId', protect, restrictTo('staff', 'admin'), supportController.updateCannedResponse);

// @route   DELETE /api/v1/support/canned-responses/:responseId
// @desc    Delete a canned response (Staff only)
// @access  Private/Staff
router.delete('/canned-responses/:responseId', protect, restrictTo('staff', 'admin'), supportController.deleteCannedResponse);

// @route   GET /api/v1/support/canned-responses/personal
// @desc    Get personal canned responses (Staff only)
// @access  Private/Staff
router.get('/canned-responses/personal', protect, restrictTo('staff', 'admin'), supportController.getPersonalCannedResponses);

// @route   GET /api/v1/support/canned-responses/shared
// @desc    Get shared canned responses (Staff only)
// @access  Private/Staff
router.get('/canned-responses/shared', protect, restrictTo('staff', 'admin'), supportController.getSharedCannedResponses);

// ==================== KNOWLEDGE BASE (Optional) ====================

// @route   GET /api/v1/support/kb/articles
// @desc    Get all knowledge base articles
// @access  Public
router.get('/kb/articles', supportController.getKBArticles);

// @route   GET /api/v1/support/kb/articles/:articleId
// @desc    Get a specific knowledge base article
// @access  Public
router.get('/kb/articles/:articleId', supportController.getKBArticle);

// @route   GET /api/v1/support/kb/search
// @desc    Search knowledge base articles
// @access  Public
router.get('/kb/search', supportController.searchKBArticles);

// @route   GET /api/v1/support/kb/categories
// @desc    Get knowledge base categories
// @access  Public
router.get('/kb/categories', supportController.getKBCategories);

// @route   POST /api/v1/support/kb/articles/:articleId/feedback
// @desc    Submit feedback on a knowledge base article
// @access  Private
router.post('/kb/articles/:articleId/feedback', protect, supportController.submitKBArticleFeedback);

// ==================== LIVE CHAT INTEGRATION (Optional) ====================

// @route   GET /api/v1/support/chat/sessions
// @desc    Get all chat sessions for current user
// @access  Private
router.get('/chat/sessions', protect, supportController.getChatSessions);

// @route   POST /api/v1/support/chat/sessions
// @desc    Start a new chat session
// @access  Private
router.post('/chat/sessions', protect, supportController.startChatSession);

// @route   GET /api/v1/support/chat/sessions/:sessionId/messages
// @desc    Get all messages from a chat session
// @access  Private
router.get('/chat/sessions/:sessionId/messages', protect, supportController.getChatMessages);

// @route   POST /api/v1/support/chat/sessions/:sessionId/messages
// @desc    Send a message in a chat session
// @access  Private
router.post('/chat/sessions/:sessionId/messages', protect, supportController.sendChatMessage);

// @route   POST /api/v1/support/chat/sessions/:sessionId/end
// @desc    End a chat session
// @access  Private
router.post('/chat/sessions/:sessionId/end', protect, supportController.endChatSession);

// @route   POST /api/v1/support/chat/sessions/:sessionId/convert-to-ticket
// @desc    Convert a chat session to a support ticket
// @access  Private
router.post('/chat/sessions/:sessionId/convert-to-ticket', protect, supportController.convertChatToTicket);

// ==================== WEBHOOKS ====================

// @route   POST /api/v1/support/webhook/email
// @desc    Webhook for email notifications
// @access  Private (Email service only)
router.post('/webhook/email', supportController.handleEmailWebhook);

// @route   POST /api/v1/support/webhook/notification
// @desc    Webhook for push notifications
// @access  Private (Notification service only)
router.post('/webhook/notification', supportController.handleNotificationWebhook);

// @route   POST /api/v1/support/webhook/sla
// @desc    Webhook for SLA monitoring
// @access  Private (SLA service only)
router.post('/webhook/sla', supportController.handleSLAWebhook);

module.exports = router;
