const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require("mongoose")
const bodyParser = require("body-parser")

app.use(bodyParser.urlencoded({
  extended: true
}))
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}, err => {
  if (err) {
    return console.log("Cannot Connect: ", err)
  }
  console.log("MongoDB - connection Established!")
})

const exerciceSchema = new mongoose.Schema({
  "description": {
    type: String,
    required: true
  },
  "duration": {
    type: Number,
    required: true
  },
  "date": String
})

const initUserSchema = new mongoose.Schema({
  "username": String,
  "log": [{ type: mongoose.SchemaTypes.ObjectId, ref: 'User' }]
})


let userModel = mongoose.model("User", initUserSchema, "user")
let exerciceModel = mongoose.model("Exercice", exerciceSchema, "exercice")

app.post("/api/users", async (req, res) => {
  try {
    let user = await userModel.create({
      username: req.body.username,
      log: []
    })
    res.status(200).json({
      "username": user["username"],
      "_id": user["_id"]
    })
  } catch (e) {
    res.status(500).json({
      "Err Code 500": "something wrong happened try later!"
    })
  }
})

app.get("/api/users/:_id/logs", async (req, res) => {
  let logsObject = await userModel.findById(req.params._id)
  console.log(logsObject)
  let logsLengths = logsObject.log.length
  let newlogsArray = await Promise.all(logsObject.log.map(value => exerciceModel.findById(value).then( x => x)))
  let filteredArray = newlogsArray.map(obj => ({"description":obj.description,"duration":obj.duration,"date":obj.date}))
  let filteredArrayLength = isNaN(req.query.limit) ? filteredArray : filteredArray.slice(0, req.query.limit)
  let logsRepsonse = {
    "_id": req.params._id,
    "username": logsObject.username,
    "count": logsLengths,
    "log": filteredArrayLength
  }
  res.status(200).json(logsRepsonse) 
})

app.post("/api/users/:_id/exercises", async (req, res) => {
  let ExeResponse = await findUserIDAndUpdate(req.params._id, req.body.date, req.body.duration, req.body.description)
  console.log(ExeResponse)
  res.status(200).json(ExeResponse)
})


async function findUserIDAndUpdate(formID, formDate, formDuration, formDescription) {
  const doesThisUserExist = await userModel.exists({
    "_id": formID
  })
  if (!doesThisUserExist) return {
    "err 404": "userID does not exist"
  }
  try {
    let userObj = await userModel.findById(formID)
    let formatedDate = new Date(formDate).toDateString() == "Invalid Date" ? new Date().toDateString() : new Date(formDate).toDateString()
    let exersiceObj = await exerciceModel.create({
      date: formatedDate,
      duration: formDuration,
      description: formDescription
    })
    userObj["log"].push(exersiceObj["_id"])
    userObj.save((err, data) => {
      if (err) return console.log("could not save the object", err)
    })

    let response = {
      "_id": exersiceObj["_id"],
      "username": userObj.username,
      "date": exersiceObj.date,
      "duration": exersiceObj.duration,
      "description": exersiceObj.description
    }
    return response
  } catch (e) {
    return console.log("error => ", e)
  }
}


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})