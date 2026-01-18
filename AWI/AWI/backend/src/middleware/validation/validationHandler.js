const { validationResult } = require('express-validator');

/**
 * Middleware to handle validation errors from express-validator
 * Should be placed after validation chains
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Format errors for user-friendly response
    const formattedErrors = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value
    }));

    // Group errors by field
    const errorsByField = formattedErrors.reduce((acc, err) => {
      if (!acc[err.field]) {
        acc[err.field] = [];
      }
      acc[err.field].push(err.message);
      return acc;
    }, {});

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      errorCode: 'VALIDATION_ERROR',
      details: errorsByField,
      timestamp: new Date().toISOString()
    });
  }

  next();
}

/**
 * Validation error handler for agent endpoints
 * Returns more structured errors for programmatic consumption
 */
function handleAgentValidationErrors(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
      location: err.location
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      errorCode: 'VALIDATION_ERROR',
      errors: formattedErrors,
      suggestedActions: [
        'Review the field requirements in the API documentation',
        'Check that all required fields are provided',
        'Ensure field values match the expected format'
      ],
      documentation: '/api/agent/docs',
      timestamp: new Date().toISOString()
    });
  }

  next();
}

module.exports = {
  handleValidationErrors,
  handleAgentValidationErrors
};
