const express = require('express');
const { randomBytes } = require('crypto');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(cors());

const commentsByPostId = {
};

app.get('/posts/:id/comments', (req, res) => {
    res.send(commentsByPostId[req.params.id] || []);
});

app.post('/posts/:id/comments', async (req, res) => {
    const commentId = randomBytes(4).toString('hex');
    const { content } = req.body;

    const comments = commentsByPostId[req.params.id] || [];
    const comment = { id: commentId, content, status: 'pending' }
    comments.push(comment);

    commentsByPostId[req.params.id] = comments;

    await axios.post("http://event-bus-service:4005/events", {
        type: "CommentCreated",
        data: {
            id: comment.id,
            content: comment.content,
            status: comment.status,
            postId: req.params.id
        }
    }).catch((err) => {
        console.log(err.message);
    });

    res.status(201).send(comments);
});

// receiving event from event bus.
app.post('/events', async (req, res) => {
    console.log("Received Event", req.body.type);
    const { type, data } = req.body;

    if (type === "CommentModerated") {
        const { id, postId, status, content } = data;
        const comments = commentsByPostId[postId];

        const comment = comments.find((comment) => {
            return comment.id === id;
        });
        comment.status = status;

        await axios.post('http://event-bus-service:4005/events', {
            type: 'CommentUpdated',
            data: {
                id,
                status,
                postId,
                content
            }
        });
    }
    res.send({});
});


app.listen(4001, () => {
    console.log('Listening on 4001');
});
