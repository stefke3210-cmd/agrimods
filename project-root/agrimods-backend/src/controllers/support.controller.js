const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const SupportTicket = require('../models/SupportTicket');
const EmailService = require('../services/email.service');

// Create new support ticket
exports.createTicket = catchAsync(async (req, res, next) => {
  const ticket = await SupportTicket.create({
    user: req.user.id,
    subject: req.body.subject,
    message: req.body.message,
    category: req.body.category || 'general',
    status: 'open'
  });
  
  // Send confirmation email
  try {
    await EmailService.sendSupportTicketConfirmation(req.user, ticket);
  } catch (error) {
    console.error('Email sending failed:', error);
  }
  
  // Notify admin team
  try {
    await EmailService.notifyAdminNewTicket(ticket);
  } catch (error) {
    console.error('Admin notification failed:', error);
  }
  
  res.status(201).json({
    status: 'success',
    data: {
      ticket
    }
  });
});

// Get user's tickets
exports.getUserTickets = catchAsync(async (req, res, next) => {
  const tickets = await SupportTicket.find({ user: req.user.id })
    .sort('-createdAt')
    .populate('user', 'name email');
  
  res.status(200).json({
    status: 'success',
    results: tickets.length,
    data: {
      tickets
    }
  });
});

// Get single ticket
exports.getTicket = catchAsync(async (req, res, next) => {
  const ticket = await SupportTicket.findById(req.params.id)
    .populate('user', 'name email')
    .populate('adminResponse.admin', 'name email');
  
  if (!ticket) {
    return next(new AppError('Ticket not found', 404));
  }
  
  // Check ownership or admin access
  if (ticket.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to view this ticket', 403));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      ticket
    }
  });
});

// Update ticket (admin only)
exports.updateTicket = catchAsync(async (req, res, next) => {
  // Admin check middleware should be applied in routes
  
  const ticket = await SupportTicket.findById(req.params.id);
  
  if (!ticket) {
    return next(new AppError('Ticket not found', 404));
  }
  
  // Update ticket status and admin response
  ticket.status = req.body.status || ticket.status;
  ticket.adminResponse = {
    admin: req.user.id,
    message: req.body.message,
    respondedAt: new Date()
  };
  
  await ticket.save();
  
  // Notify user
  try {
    await EmailService.sendSupportTicketUpdate(ticket.user, ticket);
  } catch (error) {
    console.error('Email notification failed:', error);
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      ticket
    }
  });
});

// Close ticket
exports.closeTicket = catchAsync(async (req, res, next) => {
  const ticket = await SupportTicket.findByIdAndUpdate(
    req.params.id,
    { status: 'closed', closedAt: new Date() },
    { new: true, runValidators: true }
  );
  
  if (!ticket) {
    return next(new AppError('Ticket not found', 404));
  }
  
  // Notify user
  try {
    await EmailService.sendSupportTicketClosed(ticket.user, ticket);
  } catch (error) {
    console.error('Email notification failed:', error);
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      ticket
    }
  });
});