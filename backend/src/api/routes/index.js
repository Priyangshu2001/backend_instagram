var express = require('express');
const User = require("../../models/users");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
var router = express.Router();
const {tokenPublicKey,expiresIn}=require('../Controllers/config/env')
/* GET home page. */
router.get('/ping', function(req, res, next) {
    res.send('Welcome! This is Instagram clone');
});
router.post('/login',async (req, res) => {
    const {email, password} = await req.body;
    if (!email || !password) {
        return res.status(404).json({'error': 'Some of the fields are incomplete'});
    }
     User.findOne({email: email}).then((user)=>{
         if (user.email_verified == true) {
             bcrypt.compare(password, user.password).then(matched => {
                 const token = jwt.sign({_id: user.id}, tokenPublicKey, {
                     expiresIn: expiresIn
                 });
                 return res.json({"token": token})
             })
         } else {
             return res.json({'message': 'Verify your Email first'})
         }
    })

});
module.exports = router;
