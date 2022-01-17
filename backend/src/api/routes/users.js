var express = require('express');
var router = express.Router();
const bcrypt=require('bcrypt')
const jwt=require('jsonwebtoken')
const mongoose=require('mongoose')
const User=require('../../models/users')
const Avatar=require('../../models/avatar')
const auth=require('../Controllers/middleware/Auth/auth')
const {transporter}=require('../Controllers/config/mail')
const nodemailer = require('nodemailer')
const {forgotPasswordPublicKey,email_user,emailPublicKey,tokenPublicKey,expiresIn}=require('../Controllers/config/env')
const {cloudinary}=require('../Controllers/config/cloudinary')
//for getting data
router.post('/forgot-password',async (req, res) => {
    let {email, newPassword} = await req.body
    console.log("New Password",newPassword)
    let hashed = bcrypt.hash(newPassword, 16)
    await User.findOne({email: email}).then(async user => {
        if (user) {
            let emailVerification = await jwt.sign({email: email}, forgotPasswordPublicKey, {
                expiresIn: expiresIn
            })
            console.log(emailVerification);
            var mailOptions = {
                from: email_user,
                to: email,
                subject: 'Verify Your Mail',
                html: `<h1><h2>${user.username}!</h2> Verify it's you</h1>
                        <h4>A request for changing password was made. Click the link below to verify.</h4>
                        <a href="http://localhost:3010/users/forgot-password?token=${emailVerification}&password=${hashed}">Verify</a>`
            }
            transporter.sendMail(
                mailOptions, (err, info) => {
                    if (err) {
                        console.log('Error: ', err)
                    } else {
                        console.log('Verification mail send to the mail')
                        return res.status(200).json({"Message": "Successfully Verified!!", "User": this.user})

                    }
                })
        }
    })
})
router.get('/forgot-password',async (req, res) => {
    let token = await req.query.token
    let newPass = await req.query.password
    console.log(newPass)
    await jwt.verify(token, forgotPasswordPublicKey, async (err, payload) => {
        if (err) {
            return res.status(403).json({'error': 'Unauthorized Entry'})
        } else {
            let {email}=payload
            console.log("payload", payload)
            let user=await bcrypt.hash(newPass, 16).then(async hashed => {
                console.log(hashed)
                await User.findOneAndUpdate({email: email}, {
                    password: hashed,
                    hash: hashed
                }).then(user=>{
                    res.status(200).json({"user":user})
                }).catch(e=>{

                })

            })

        }
    })
})
router.post('/signup',(req,res)=>{
  const {username,email,password}=req.body;
  if(!username || !email||!password){
    return res.status(404).json({'error':'Some of the fields are incomplete'});
  }
    User.findOne({username:username}).then((present)=>{
    if(!present){
         bcrypt.hash(password,16).then(async (hashed) => {
             const user = new User({
                 username: username, email: email, password: hashed, hash: hashed,
             })
             let emailVerification = jwt.sign({_id: user.id}, emailPublicKey,{
                 expiresIn:expiresIn
             });
             user.save().then(async user => {
                 const mailOpts = {
                     from: email_user,
                     to: email,
                     subject: 'Verify Your Mail',
                     html: `<h1><h2>${username}!</h2> Thanks For registering</h1>
                        <h4>Please verify the mail through this link</h4>
                        <a href="http://localhost:3010/users/email_verify?token=${emailVerification}"> Verify your mail</a>`
                 };
                 await transporter.sendMail(
                     mailOpts, (err, info) => {
                         if (err) {
                             console.log('Error: ', err)
                         } else {
                             console.log('Verification mail send to the mail')
                             return res.status(200).json({"Message": "Verification mail send to the mail!!", "User": this.user})
                         }
                     }
                 )
             })
         });
    }
    else{
      return res.status(404).json({'error':'Email already present'});
    }
  })
});

router.get('/email_verify',(req,res)=>{
    let token = req.query.token;
    jwt.verify(token, emailPublicKey, async (err, payload) => {
        if (err) {
            return res.status(403).json({'error': 'Unauthorized Entry'})
        } else {
            const {_id} = payload
            console.log(payload)
            await User.findByIdAndUpdate(_id, {
                email_verified: true
            })
            res.status(200).send(`Congratulations you have verifed`)
        }
    })
    } )
router.get('/:id',auth,(req,res)=>{

        User.findById(req.params.id).then(user=>{
            res.status(200).json({'message':'Welcome ','Your username':req.user.username,"Searched Username":user.username})
        })
})
router.get('/', auth,async function (req, res, next) {
    const {search} = req.body;

    let searchPatt = new RegExp("^" + search)
    User.find({
        $or: [
            {email: {$regex: searchPatt}},
            {username: {$regex: searchPatt}}
        ]
    },).limit(100).then(user=>{
        if(user){
            res.status(200).json(user);
        }
        else{
            res.status(400).json({"message":"Something went wrong"});
        }
    })
});

router.put('/:id',auth,async (req, res) => {
    const {username, email, password} = await req.body
    let AuthUser=req.user;
    console.log(AuthUser.id);
    console.log(req.params.id)
    if(AuthUser.id == req.params.id){
        await bcrypt.hash(password, 16,async (err, hashed) => {
                 await User.findByIdAndUpdate(req.params.id,
                        {
                            email: email,
                            username: username,
                            password: hashed,
                            hash: hashed,
                            updated_at: Date.now()
                        })
                    return res.json({'message': 'changed'})
        })
    }
    else{
        res.status(400).json({'message':'bhakkk'})
    }


})
router.post('/photo-upload',auth, async (req, res) => {
    try {
        if(req.params.id != req.user._id) {
            let authUser = await req.user;
            console.log(authUser);
            const fileStr = req.files.photos;
            console.log(fileStr)
            const uploadResponse = await cloudinary.uploader.upload(
                fileStr.tempFilePath,
                {
                    upload_preset: 'dev_setup',
                });
            console.log(uploadResponse)
            User.findByIdAndUpdate(
                req.user._id,
                {
                    profile_pic_url: uploadResponse.url
                }
            ).then(
                user => {
                    Avatar.findOne({
                        public_id: uploadResponse.public_id
                    }).then(info => {
                            console.log(info);
                            if (!info) {
                                let av = Avatar({
                                    user_id: req.user._id,
                                    public_id: uploadResponse.public_id
                                })
                                av.save().then(
                                    user => {
                                        res.status(200).json({
                                            "message": "Success!!",
                                            "result": uploadResponse
                                        })
                                    }
                                )
                            }
                        }
                    )

                }
            ).catch(err => {
                res.status(400).json({
                    "message": "Failure!!",
                })
            })
        }
        else{

            res.status(414).json({"Message":"Error occured"})
        }
    } catch (e) {
        res.status(500).json({
            "message":"Failure!!",
        })
        console.log(e);
    }
});
router.put('/:id/approve',auth,(req,res)=>{
    if(req.params.id != req.user._id) {
        User.findByIdAndUpdate(req.user._id, {
            $push: {
                followers: req.params.id
            },

        }, {new: true}).then(user => {

            if (user) {
                User.findByIdAndUpdate(req.params.id, {
                    $push: {
                        following: req.user._id
                    }
                }, {new: true}).then(u => {
                    User.findByIdAndUpdate(req.user._id, {
                        $pull: {approve: req.params.id}
                    }, {new: true}).then(k => {
                        res.status(200).json({"User": k, "Friend": u})
                    }).catch(e=>{

                        res.status(414).json({"Message":"Error occured"})
                    })

                })
            }
        })
    }
    else{

        res.status(414).json({"Message":"Error occured"})
    }
})
router.put('/:id/cancel-request',auth,(req,res)=>{
    if(req.params.id != req.user._id){
        User.findByIdAndUpdate(req.user._id,{
            $pull:{approve:req.params.id}
        },{new:true}).then(k=>{
            res.status(200).json({"User":k,"Friend":u})
        })
    }
    else{
        res.status(414).json({"Message":"Error occured"})
    }

})

router.put("/:id/follow",auth,(req, res) => {
    if(req.params.id != req.user._id){
        User.findByIdAndUpdate(req.params.id,{
            $push:{
                approve:req.user.id
            }
        },{new:true},(err,result)=>{
            if(err) return res.status(414).json({"Message":"Error occured"})
            res.status(200).json({"Message":"Friend Request sent"})
        })
    }
    else{
        res.status(414).json({"Message":"Error occured"})
    }

})
router.put("/:id/unfollow",auth,(req, res) => {
    if(req.params.id != req.user._id){
        User.findByIdAndUpdate(req.user._id,{
            $pull:{following:req.params.id}
        },{new:true}).then(result=>{
            res.status(200).json(result);
        }).catch(e=>{
            res.status(414).json({"Message":"Error occured" ,e})
        })
    }
    else{
        res.status(414).json({"Message":"Error occured"})
    }

})

router.get('/:id/followers',auth, async (req, res) => {
    try {
        if(req.params.id != req.user._id){

            let users = await User.findOne(
                {_id: req.params.id,},
                {followers: true, _id: false},
            ).populate('followers', '_id username email profile_pic_url')
                .exec();
            res.status(200).json(users.followers)
        }
        else{
            res.status(414).json({"Message":"Error occured"})
        }
    }catch (e) {
        res.status(404).json(e)
    }
})
router.get('/:id/following',auth, async (req, res) => {
    try {
        if(req.params.id != req.user._id){
            let users = await User.findOne(
                {_id: req.params.id,},
                {following: true, _id: false},
            ).populate('following', '_id username email profile_pic_url')
                .exec();
            res.status(200).json(users.following)
        }
        else{
            res.status(414).json({"Message":"Error occured"})
        }

    }catch (e) {
        res.status(404).json(e)
    }
})
router.get("/requests",async (req, res) => {
    try {
        if(req.params.id != req.user._id){
            let users = await User.findOne(
                {_id: req.params.id,},
                {approve: true, _id: false},
            ).populate('following', '_id username email profile_pic_url')
                .exec();
            res.status(200).json(users.approve)
        }
        else{
            res.status(414).json({"Message":"Error occured"})
        }

    } catch (e) {
        res.status(404).json(e)
    }
})
router.put('/:id/remove',auth,async(req,res)=>{
    if(req.params.id != req.user._id){
        User.findByIdAndUpdate(req.user._id,{
            $pull:{following:req.params.id}
        },{new:true}).catch(e=>{
            res.status(414).json({"Message":"Error occured" ,e})
        }).then(user=>{
            User.findByIdAndUpdate(req.params.id,{
                    $pull:{followers:req.user._id}}
                ,{new:true}).then(result=>{
                res.status(200).json(result);
            }).catch(e=>{
                res.status(414).json({"Message":"Error occured" ,e})
            })
        })
    }
    else{
        res.status(414).json({"Message":"Error occured"})
    }

})
router.put('/:id/block',auth,(req,res)=>{
    if(req.params.id != req.user._id){
        User.findByIdAndUpdate(req.user._id, {
            $pull: {following: req.params.id}
        },{new:true},(err1,result1)=>{
            if(err1) res.status(414).json(err1)
            User.findByIdAndUpdate(req.user._id,{
                $pull:{followers:req.params.id}
            },{new:true},(err2,result2)=>{
                if(err2) res.status(414).json(err2)
                User.findByIdAndUpdate(req.user._id, {
                    $push: {blocked: req.params.id}
                },{new:true},(err3,result3)=>{
                    if(err3) res.status(414).json(err3)
                    res.status(200).json(result3);
                })
            })
        })
    }
    else{
        res.status(414).json({"Message":"Error occured"})
    }

})
router.put('/:id/unblock',auth,(req,res)=>{
    if(req.params.id != req.user._id){
        User.findByIdAndUpdate(req.user._id,{
            $pull:{
                blocked:req.params.id
            }
        },{new:true},(err,result)=>{
            if(err){
                res.status(414).json({"Message":"Error occured" ,e})
            }
            else {
                res.status(200).json(result);
            }

        })
    }
    else{
        res.status(414).json({"Message":"Error occured"})
    }

})

router.get("/:id/suggestion",auth,async (req, res) => {

    try {
        if(req.params.id != req.user._id){
            req.user._id;
            const user = await User.findById(req.user._id).populate({
                path: "followers",
                model: User,
                select: "followers",
            });

            let suggestedIds = new Set();
            user.followers.map((friend) => {
                friend.followers.map((f) => {
                    console.log(f.toString(), typeof f.toString());
                    if (f.toString() !== req.user._id && !suggestedIds.has(f.toString()))
                        suggestedIds.add(f.toString());
                });
            });
            const usr = await User.findById(req.user._id).populate({
                path: "following",
                model: User,
                select: "following",
            });
            usr.following.map((friend) => {
                friend.following.map((f) => {
                    console.log(f.toString(), typeof f.toString());
                    if (f.toString() !== req.user._id && !suggestedIds.has(f.toString()))
                        suggestedIds.add(f.toString());
                });
            });
            res.status(200).json(suggestedIds)
        }
        else{
            res.status(414).json({"Message":"Error occured"})
        }

    }
    catch (e) {
        res.status(400).json(e)
    }
})
module.exports = router;
