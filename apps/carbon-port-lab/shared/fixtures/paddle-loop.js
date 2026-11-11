// paddle.js — 2009. One canvas, one ball, arrow keys.
var canvas = document.getElementById("game");
var ctx = canvas.getContext("2d");
var ball = { x: 50, y: 40, vx: 3, vy: 2 };
var paddle = { x: 80, y: 140, w: 48, h: 8 };
var score = 0;

function tick() {
  ball.x += ball.vx;
  ball.y += ball.vy;
  if (ball.x < 0 || ball.x > canvas.width) ball.vx *= -1;
  if (ball.y < 0) ball.vy *= -1;
  if (ball.y > paddle.y && ball.x > paddle.x && ball.x < paddle.x + paddle.w) {
    ball.vy *= -1;
    score += 1;
  }
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.fillRect(ball.x, ball.y, 8, 8);
  ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
  ctx.fillText("score " + score, 8, 12);
  setTimeout(tick, 30);
}

document.onkeydown = function (e) {
  if (e.keyCode === 37) paddle.x -= 12;
  if (e.keyCode === 39) paddle.x += 12;
};

tick();
