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
    console.log("DEU RUIM");
    const errors = validation.error.details.map((detail) => detail.message);
    res.status(422).send(`${errors}`);
    return;
  }

  try {
    console.log("entrei no try");
    await db.collection("participantes").insertOne({
      nome: name,
      lastStatus: Math.round(Date.now() / 1000),
    });
    await db.collection("batePapo").insertOne({
      from: "xxx",
      to: "todos",
      text: `${name} entra na sala...`,
      type: "status",
      time: dayjs().format("HH/mm/ss"),
    });
    res.sendStatus(201);
    return;
  } catch (err) {
    console.log("não conseguiu fazer o insert");
    console.log(err);
    res.status(500).send(err);
    return;
  }
});

app.post("/messages", async (req, res) => {
  const message = req.body;
  const validation = messageSchema.validate(message, { abortEarly: false });
  console.log(message);

  if (!validation) {
    console.log("DEU RUIM");
    const errors = validation.error.details.map((detail) => detail.message);
    res.status(422).send(`${errors}`);
    return;
  }

  try {
    await db.collection("batePapo").insertOne(message);
    res.status(201).send("sucesso ao postar a mensagem");
  } catch (err) {
    res.sendStatus(422);
    console.log(err);
  }
});

app.get("/participants", async (req, res) => {
  try {
    let result = await db.collection("participantes").find().toArray();
    console.log(result);
    res.send(result);
  } catch (err) {
    console.log(err, "deu ruim");
  }
});

app.listen(5000, () => console.log("rodando na porta 5000"));
