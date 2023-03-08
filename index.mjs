import axios from 'axios';
import { stringify } from 'csv/sync';
import fs from 'fs';

const transformCommentsData = (comments) => {
  return comments.map(comment => {
    const permalink = comment.permalink.split('/');
    const date = new Date(comment.created_utc * 1000);
    return {
      id: comment.id,
      author: comment.author,
      post: permalink[permalink.length - 3],
      date: date.toUTCString(),
      score: comment.score,
      comment: comment.body.replace(/(\r\n|\n|\r)/gm, ''),
    };
  });
}

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const client = axios.create({
  baseURL: 'https://api.pushshift.io',
});
const baseCommentUrl = '/reddit/comment/search?subreddit=webdev&size=500';
let url = baseCommentUrl;
let allComments = [];

do {
  const commentsResponse = await client(url);
  const comments = commentsResponse.data.data;

  if (comments.length < 1) {
    break;
  }

  const newComments = comments.filter(item => !allComments.some(comment => comment.id === item.id));
  const result = transformCommentsData(newComments);
  allComments = allComments.concat(result);


  let lastId = null;
  let oldestDate = Date.now();

  for (const comment of allComments) {
    const createdAt = new Date(comment.date).getTime();
    if (createdAt < oldestDate) {
      lastId = comment.id;
      oldestDate = createdAt;
    }
  }

  url = `${baseCommentUrl}&before=${oldestDate / 1000}`;

  console.log(`${ allComments.length } last id ${lastId}`);

  if (newComments.length > 0) {
    const csv = stringify(allComments, {
      header: true
    });

    fs.writeFileSync('data/comments.csv', csv, 'utf-8');
  } else {
    await sleep(2000);
  }
} while (url);
