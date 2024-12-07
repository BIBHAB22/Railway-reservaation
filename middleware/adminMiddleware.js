const checkAdminApiKey = (req, res, next) => {
    const adminApiKey = req.headers['x-admin-api-key'];
  
    if (!adminApiKey) {
      return res.status(401).json({ 
        message: 'Admin API key is required' 
      });
    }
  
    if (adminApiKey !== process.env.ADMIN_API_KEY) {
      return res.status(403).json({ 
        message: 'Invalid admin API key' 
      });
    }
  
    next();
  };
  
  module.exports = { checkAdminApiKey };