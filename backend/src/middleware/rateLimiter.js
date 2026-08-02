const loginSignupRequests = new Map();

// Clean up memory periodically (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of loginSignupRequests.entries()) {
    if (now > data.resetTime) {
      loginSignupRequests.delete(ip);
    }
  }
}, 10 * 60 * 1000);

const rateLimiter = (limit = 100, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();

    if (!loginSignupRequests.has(ip)) {
      loginSignupRequests.set(ip, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    const rateData = loginSignupRequests.get(ip);

    if (now > rateData.resetTime) {
      // Window expired, reset
      rateData.count = 1;
      rateData.resetTime = now + windowMs;
      return next();
    }

    rateData.count += 1;

    if (rateData.count > limit) {
      res.setHeader('Retry-After', Math.ceil((rateData.resetTime - now) / 1000));
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
      });
    }

    next();
  };
};

module.exports = rateLimiter;
