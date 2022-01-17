const cloudinary=require('cloudinary').v2
const {CLOUDINARY} = require('./env')
cloudinary.config({
    cloud_name:CLOUDINARY.CLOUDINARY_NAME,
    api_key:CLOUDINARY.CLOUDINARY_API_KEY,
    api_secret:CLOUDINARY.CLOUDINARY_SECRET_KEY
});

module.exports={cloudinary};