const formatDateTime = (dateTime, options) => {
    try {
      return new Intl.DateTimeFormat('en-US', options).format(new Date(dateTime));
    } catch (error) {
      console.error('Error formatting dateTime:', dateTime, error);
      return 'Invalid time';
    }
  };
  
  module.exports = { formatDateTime };
  