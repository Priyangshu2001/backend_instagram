const mongoose = require("mongoose");
const avatar_info=mongoose.Schema({
    user_id:{
        type:String,
        required:true,
        unique: true
    },
    public_id:{
        type:String,
        required:true,
        unique: true
    }
})
module.exports=mongoose.model('Avatar',avatar_info)