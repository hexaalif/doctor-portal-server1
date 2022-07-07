const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dewmjv2.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const serviceCollection = client
      .db("doctors_portal")
      .collection("services");
    const bookingCollection = client
      .db("doctors_portal")
      .collection("bookings");

    app.get("/services", async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });

    // Warning:
    // this is not a proper way to query
    // after learning more about mongodb. use aggregate lookup, pipeline, match, group

    app.get("/available", async (req, res) => {
      const date = req.query.date;

      // step 1: get all services. output: [{},{},{},{},{}]
      const services = await serviceCollection.find().toArray();

      // step 2: get the booking of that day
      const query = { date: date };
      const bookings = await bookingCollection.find(query).toArray();

      // step 3: for each service
      services.forEach((service) => {
        // step 4: find bookings for that service. output: [{},{},{}]
        const serviceBookings = bookings.filter(
          (booking) => booking.treatment === service.name
        );
        // step 5: select flots for the serviceBookings: ['','','']
        const bookedSlots = serviceBookings.map((booking) => booking.slot);
        // step: select those slots that are not in bookedSlots
        const available = service.slots.filter(
          (slot) => !bookedSlots.includes(slot)
        );
        service.slots = available;
      });

      res.send(services);
    });

    /**
     * API Naming convention
     * app.get('/booking') //get all bookings in this collection. or get more than one or by filter
     * app.get('/booking/:id') // get a specific booking
     * app.post('/booking) // add a new booking
     * app.patch('booking/:id') // update specific one
     * app.delete('booking/:id') // delete specific one
     */

    app.get("/booking", async (req, res) => {
      const patient = req.query.patient;
      const query = { patient: patient };
      const bookings = await bookingCollection.find(query).toArray();
      res.send(bookings);
    });

    app.post("/booking", async (req, res) => {
      const booking = req.body;
      const query = {
        treatment: booking.treatment,
        date: booking.date,
        patient: booking.patient,
      };
      const exists = await bookingCollection.findOne(query);
      if (exists) {
        return res.send({ success: false, booking: exists });
      }
      const result = await bookingCollection.insertOne(booking);
      return res.send({ success: true, result });
    });
  } finally {
    // it's finally
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello from doctor uncle");
});

app.listen(port, () => {
  console.log(`Doctors port app listening on port ${port}`);
});
