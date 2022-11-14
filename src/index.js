import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import joi from "joi";
import dayjs from "dayjs";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

let fifteenSeconds = 5;

const userSchema = joi.object({
  name: joi.string().required().max(15).min(3),
});
const messageSchema = joi.object({
  to: joi.string().required(),
  text: joi.string().required(),
  type: joi.string().valid("message", "private_message").required(),
});

dotenv.config();
const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
mongoClient.connect().then(() => {
  db = mongoClient.db("batePapoAPI");
});

app.post("/participants", async (req, res) => {
  const { name } = req.body;
  const validation = userSchema.validate(req.body, { abortEarly: false });

  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    res.status(422).send(`${errors}`);
    return;
  }

  const isNotAvaible = await db
    .collection("participants")
    .findOne({ name: name });

  console.log(isNotAvaible);

  if (isNotAvaible) {
    res.sendStatus(409);
    return;
  }

  try {
    await db.collection("participants").insertOne({
      name: name,
      lastStatus: Math.round(Date.now() / 1000),
    });
    await db.collection("messages").insertOne({
      from: "xxx",
      to: "todos",
      text: `${name} entra na sala...`,
      type: "status",
      time: dayjs().format("HH:mm:ss"),
    });
    res.sendStatus(201);
    return;
  } catch (err) {
    res.status(500).send(err);
    return;
  }
});

app.post("/messages", async (req, res) => {
  const message = req.body;
  const { user } = req.headers;
  const validation = messageSchema.validate(message, { abortEarly: false });
  message.from = user;

  if (!user) {
    console.log(user);
    res.sendStatus(402);
    return;
  }

  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    res.status(422).send(`${errors}`);
    return;
  }

  try {
    message.time = dayjs().format("HH:mm:ss");
    await db.collection("messages").insertOne(message);
    const timeNow = Math.round(Date.now() / 1000);
    await db
      .collection("participants")
      .updateOne({ name: user }, { $set: { lastStatus: timeNow } });
    res.status(201).send("sucesso ao postar a mensagem");
    return;
  } catch (err) {
    res.sendStatus(422);
    return;
  }
});

app.post("/status", async (req, res) => {
  if (fifteenSeconds === 15) {
    const listOfParticipants = await db
      .collection("participants")
      .find()
      .toArray();

    const timeNow = Math.round(Date.now() / 1000);

    let listFiltred = listOfParticipants.filter((participant) => {
      if (timeNow - participant.lastStatus > 10) {
        return true;
      } else {
        return false;
      }
    });

    listFiltred.length > 0
      ? console.log(timeNow - listFiltred[0].lastStatus)
      : "";

    for (let i = 0; i < listFiltred.length; i++) {
      let from = listFiltred[i].name;
      let leaveMessage = {
        from: from,
        to: "Todos",
        text: "sai da sala...",
        type: "status",
        time: dayjs().format("HH:mm:ss"),
      };
      await db.collection("participants").deleteOne(listFiltred[i]);
      await db.collection("messages").insertOne(leaveMessage);
    }

    console.log("rodei os 15s");
    fifteenSeconds = 5;
  } else {
    fifteenSeconds += 5;
  }
  const timeNow = Math.round(Date.now() / 1000);
  const { user } = req.headers;
  await db
    .collection("participants")
    .updateOne({ name: user }, { $set: { lastStatus: timeNow } });
  return res.sendStatus(200);
});

app.get("/participants", async (req, res) => {
  try {
    let result = await db.collection("participants").find().toArray();

    res.send(result);
  } catch (err) {}
});

app.get("/messages", async (req, res) => {


  try {
    let result = await db.collection("messages").find().toArray();
    res.send(result);
  } catch (err) {
    res.send(err);
  }
});

app.listen(5000, () => console.log("rodando na porta 5000"));
