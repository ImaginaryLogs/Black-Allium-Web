import * as mongo from "mongoose"

const userSchema = new mongo.Schema({
    clientID: String,
    clientSecret: String,
    refreshToken: String
})

module.exports = mongo.model("User", userSchema);