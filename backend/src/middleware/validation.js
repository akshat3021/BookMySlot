const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateSignup = (req, res, next) => {
  const { email, password, first_name, last_name, role } = req.body;

  const errors = {};

  if (!email || typeof email !== 'string' || !validateEmail(email.trim())) {
    errors.email = 'A valid email address is required.';
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.password = 'Password must be at least 6 characters long.';
  }

  if (!first_name || typeof first_name !== 'string' || !first_name.trim()) {
    errors.first_name = 'First name is required.';
  }

  if (!last_name || typeof last_name !== 'string' || !last_name.trim()) {
    errors.last_name = 'Last name is required.';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  // Sanitize values
  req.body.email = email.trim().toLowerCase();
  req.body.first_name = first_name.trim();
  req.body.last_name = last_name.trim();

  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  const errors = {};

  if (!email || typeof email !== 'string' || !validateEmail(email.trim())) {
    errors.email = 'A valid email address is required.';
  }

  if (!password || typeof password !== 'string' || !password) {
    errors.password = 'Password is required.';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  req.body.email = email.trim().toLowerCase();
  next();
};

const validateService = (req, res, next) => {
  const { name, description, duration_minutes, price } = req.body;
  const isPut = req.method === 'PUT';
  const errors = {};

  if (!isPut || name !== undefined) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      errors.name = 'Service name is required.';
    }
  }

  if (description !== undefined && typeof description !== 'string') {
    errors.description = 'Description must be a string.';
  }

  if (!isPut || duration_minutes !== undefined) {
    const parsedDuration = parseInt(duration_minutes, 10);
    if (duration_minutes === undefined || isNaN(parsedDuration) || parsedDuration <= 0) {
      errors.duration_minutes = 'Duration must be a positive integer.';
    } else {
      req.body.duration_minutes = parsedDuration;
    }
  }

  if (!isPut || price !== undefined) {
    const parsedPrice = parseFloat(price);
    if (price === undefined || isNaN(parsedPrice) || parsedPrice < 0) {
      errors.price = 'Price must be a non-negative number.';
    } else {
      req.body.price = parsedPrice;
    }
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  // Sanitize values
  if (name !== undefined) req.body.name = name.trim();
  if (description !== undefined) req.body.description = description ? description.trim() : null;

  next();
};

const validateSlot = (req, res, next) => {
  const { service_id, start_time, end_time, status } = req.body;
  const isPut = req.method === 'PUT';
  const errors = {};

  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  
  if (!isPut || service_id !== undefined) {
    if (!service_id || typeof service_id !== 'string' || !uuidRegex.test(service_id)) {
      errors.service_id = 'A valid service UUID is required.';
    }
  }

  let start;
  if (!isPut || start_time !== undefined) {
    start = new Date(start_time);
    if (!start_time || isNaN(start.getTime())) {
      errors.start_time = 'A valid start time ISO string is required.';
    } else if (start <= new Date()) {
      errors.start_time = 'Start time must be in the future.';
    }
  }

  let end;
  if (!isPut || end_time !== undefined) {
    end = new Date(end_time);
    if (!end_time || isNaN(end.getTime())) {
      errors.end_time = 'A valid end time ISO string is required.';
    } else if (start && !isNaN(start.getTime()) && end <= start) {
      errors.end_time = 'End time must be after the start time.';
    }
  }

  if (status !== undefined && (typeof status !== 'string' || !['available', 'booked', 'blocked'].includes(status))) {
    errors.status = "Status must be one of 'available', 'booked', or 'blocked'.";
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  if (start_time !== undefined && start) req.body.start_time = start.toISOString();
  if (end_time !== undefined && end) req.body.end_time = end.toISOString();
  if (!isPut && !status) req.body.status = 'available';

  next();
};

const validateBooking = (req, res, next) => {
  const { slot_id, service_id } = req.body;
  const errors = {};

  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (!slot_id || typeof slot_id !== 'string' || !uuidRegex.test(slot_id)) {
    errors.slot_id = 'A valid slot UUID is required.';
  }

  if (!service_id || typeof service_id !== 'string' || !uuidRegex.test(service_id)) {
    errors.service_id = 'A valid service UUID is required.';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

const validateReschedule = (req, res, next) => {
  const { new_slot_id } = req.body;
  const errors = {};

  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (!new_slot_id || typeof new_slot_id !== 'string' || !uuidRegex.test(new_slot_id)) {
    errors.new_slot_id = 'A valid new slot UUID is required.';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

const validateContact = (req, res, next) => {
  const { name, email, message } = req.body;
  const errors = {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    errors.name = 'Name is required.';
  }

  if (!email || typeof email !== 'string' || !validateEmail(email.trim())) {
    errors.email = 'A valid email address is required.';
  }

  if (!message || typeof message !== 'string' || !message.trim()) {
    errors.message = 'Message is required.';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  req.body.name = name.trim();
  req.body.email = email.trim().toLowerCase();
  req.body.message = message.trim();

  next();
};

module.exports = {
  validateSignup,
  validateLogin,
  validateService,
  validateSlot,
  validateBooking,
  validateReschedule,
  validateContact,
};
