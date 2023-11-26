require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const crypto = require('crypto')
// mongodb connection
const {MongoClient, ServerApiVersion} = require('mongodb');
const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ping: 1});
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
    }
}

run().catch(console.dir);

const app = express()
const port = process.env.PORT || 4000

app.use(bodyParser.json())

app.get('/', (req, res) => {
    res.status(200)
    res.send(`Zoom Webhook sample successfully running. Set this URL with the /webhook path as your apps Event notification endpoint URL. https://github.com/zoom/webhook-sample`)
})

app.post('/webhook', (req, res) => {

    let response

    console.log(req.headers)
    console.log(req.body)

    // construct the message string
    const message = `v0:${req.headers['x-zm-request-timestamp']}:${JSON.stringify(req.body)}`

    const hashForVerify = crypto.createHmac('sha256', process.env.ZOOM_WEBHOOK_SECRET_TOKEN).update(message).digest('hex')

    // hash the message string with your Webhook Secret Token and prepend the version semantic
    const signature = `v0=${hashForVerify}`

    // you're validating the request came from Zoom https://marketplace.zoom.us/docs/api-reference/webhook-reference#notification-structure
    if (req.headers['x-zm-signature'] === signature) {

        // Zoom validating you control the webhook endpoint https://marketplace.zoom.us/docs/api-reference/webhook-reference#validate-webhook-endpoint
        if (req.body.event === 'endpoint.url_validation') {
            const hashForValidate = crypto.createHmac('sha256', process.env.ZOOM_WEBHOOK_SECRET_TOKEN).update(req.body.payload.plainToken).digest('hex')

            response = {
                message: {
                    plainToken: req.body.payload.plainToken, encryptedToken: hashForValidate
                }, status: 200
            }

            console.log(response.message)

            res.status(response.status)
            res.json(response.message)
        } else {
            const db = client.db();
            const collection = db.collection('meetings');
            response = {message: 'Authorized request to Zoom Webhook sample.', status: 200}
            console.log(response.message)
            const {event, payload} = req.body;
            collection.insertOne({event, payload}, (err) => {
                if (err) {
                    console.error('Error saving Zoom webhook data:', err);
                    res.status(500).send('Internal Server Error');
                } else {
                    console.log('Zoom webhook data saved to MongoDB');
                    res.status(200).send('OK');
                }
            }).then(r => console.log("Document Saved")).catch(err => console.log(err));

            res.status(response.status)
            res.json(response)

            // business logic here, example make API request to Zoom or 3rd party

        }
    } else {

        response = {message: 'Unauthorized request to Zoom Webhook sample.', status: 401}

        console.log(response.message)

        res.status(response.status)
        res.json(response)
    }
})

app.listen(4000, () => {
    console.log(`Server is running on port ${port}`)
})