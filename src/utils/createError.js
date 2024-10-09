const createError = (status, message) => {
  const err = new Error(message);
  err.statusCode = status;
  throw err;
};

module.exports = createError;
