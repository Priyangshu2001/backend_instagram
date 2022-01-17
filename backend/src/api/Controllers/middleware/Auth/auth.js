const jwt=require('jsonwebtoken')
const mongoose=require('mongoose')
const User=require('../../../../models/users')
const {tokenPublicKey}=require('../../config/env')
module.exports=async (req,res,next)=>{
     const {authorization}=req.headers
    if(!authorization){
        return res.status(400).json({'error':'You have to be logged in'})
    }
    const token=authorization.replace("Bearer ","")
    await jwt.verify(token,tokenPublicKey,(err,payload)=>{
        if(err){
            return res.status(403).json({'error':'You have to be logged in'})
        }
        else{
            const {_id}=payload
            console.log(payload)
            User.findById(_id).then(userdata=>{
                req.user=userdata

                next();
            })
        }

    })
}