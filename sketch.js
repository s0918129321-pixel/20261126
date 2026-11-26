let bgImg;

// ==================== 角色1 設定 ====================
let char1Imgs = {};
let char1X, char1Y, char1VY = 0;
let char1Speed = 5;
let char1Gravity = 0.8;
let char1JumpPower = -14;
let char1Facing = 1; // 1 = 朝右, -1 = 朝左
let char1State = 'stop'; // 'stop' | 'walk' | 'jump' | 'magic'
let char1AnimIndex = 0;
let char1AnimSpeed = 0.18;

// 魔法特效狀態
let magicEffectActive = false;
let magicEffectIndex = 0;
let magicEffectX = 0;
let magicEffectY = 0;

// 角色1 各動作精靈圖參數
const CHAR1_SPRITES = {
  stop: { path: '1/stop/stop.png', frames: 8, w: 80, h: 120 },
  walk: { path: '1/walk/walk.png', frames: 8, w: 80, h: 120 },
  jump: { path: '1/jump/jump.png', frames: 6, w: 80, h: 120 },
  magic: { path: '1/magic/magic.png', frames: 8, w: 90, h: 120 },
  effect: { path: '1/magic_effect/magic_effect.png', frames: 8, w: 120, h: 120 }
};

// ==================== 角色2 設定 ====================
let char2StopImg, char2ActionImg;
let char2X, char2Y;
let char2State = 'stop'; // 'stop' | 'action'
let char2AnimIndex = 0;
let char2AnimSpeed = 0.15;
let triggerDistance = 200;

const CHAR2_STOP_FRAMES = 8;
const CHAR2_STOP_W = 699 / 8;
const CHAR2_STOP_H = 190;

const CHAR2_ACTION_FRAMES = 9;
const CHAR2_ACTION_W = 1347 / 9;
const CHAR2_ACTION_H = 177;

// ==================== 問答介面與特效設定 ====================
let showQuiz = false;
let quizQuestion = '';
let quizAnswer = 0;
let quizOptions = []; // 4 個選項數值
let optionButtons = []; // 儲存 4 個按鈕的座標與尺寸
let quizFeedback = ''; // '' | 'correct' | 'wrong'

// 三秒特效計時與粒子
let effectType = 'none'; // 'none' | 'firework' | 'lightning'
let effectEndTime = 0;
let fireworks = [];
let nextFireworkSpawn = 0;

function preload() {
  bgImg = loadImage('bg/3.png');

  for (let key in CHAR1_SPRITES) {
    char1Imgs[key] = loadImage(
      CHAR1_SPRITES[key].path,
      function () {},
      function () {
        console.warn('找不到角色1素材：' + CHAR1_SPRITES[key].path);
      }
    );
  }

  char2StopImg = loadImage('2/stop/stop.png');
  char2ActionImg = loadImage('2/action/action.png');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);

  let bgScale = height / bgImg.height;
  let singleBgWidth = bgImg.width * bgScale;
  let groundY = height * 0.75;

  char1X = 0;
  char1Y = groundY;

  char2X = -singleBgWidth;
  char2Y = groundY;
}

function draw() {
  background(220);

  let bgScale = height / bgImg.height;
  let singleBgWidth = bgImg.width * bgScale;
  let groundY = height * 0.75;

  // 1. 更新角色1位置與狀態
  updateCharacter1(singleBgWidth, groundY);

  // 2. 攝影機跟隨角色1
  push();
  translate(width / 2 - char1X, 0);

  // 3. 繪製三張背景圖（左、中、右）
  image(bgImg, -singleBgWidth, height / 2, singleBgWidth, height);
  image(bgImg, 0, height / 2, singleBgWidth, height);
  image(bgImg, singleBgWidth, height / 2, singleBgWidth, height);

  // 4. 偵測角色1與角色2距離，切換狀態與問答方框
  let d = dist(char1X, char1Y, char2X, char2Y);
  let isNear = d < triggerDistance;
  let nextState = isNear ? 'action' : 'stop';

  if (char2State !== nextState) {
    char2State = nextState;
    char2AnimIndex = 0;

    if (isNear) {
      // 剛接近角色2時，產生新題目並開啟問答方框
      generateMathQuiz();
      showQuiz = true;
    } else {
      // 遠離角色2時，關閉問答方框
      showQuiz = false;
    }
  }

  // 5. 繪製角色2、角色1與魔法特效
  drawCharacter2();
  drawCharacter1();
  drawMagicEffect();

  pop();

  // 6. 繪製固定在畫布上方的數學選擇題方框（不受攝影機捲動影響）
  if (showQuiz) {
    drawQuizBox();
  }

  // 7. 繪製三秒煙火或閃電特效（最上層）
  updateAndDrawSpecialEffects();
}

// ==================== 數學題目產生與方框繪製 ====================
function generateMathQuiz() {
  let a = floor(random(1, 50));
  let b = floor(random(1, 50));
  quizAnswer = a + b;
  quizQuestion = `${a} + ${b} = ?`;
  quizFeedback = '';

  let opts = new Set([quizAnswer]);
  while (opts.size < 4) {
    let offset = floor(random(-12, 13));
    let candidate = quizAnswer + offset;
    if (offset !== 0 && candidate > 0) {
      opts.add(candidate);
    }
  }

  quizOptions = shuffle(Array.from(opts));
}

function drawQuizBox() {
  // 方框寬為畫布寬的 1/3，高為畫布高的 1/2
  let boxW = width / 3;
  let boxH = height / 2;
  // 方框中間對準畫布中間，上方靠近畫布上方
  let boxX = (width - boxW) / 2;
  let boxY = 15;

  push();
  // 透明度為 90 的黃色方框
  fill(255, 230, 80, 90);
  stroke(220, 175, 20, 200);
  strokeWeight(3);
  rectMode(CORNER);
  rect(boxX, boxY, boxW, boxH, 16);

  // 標題與題目文字
  noStroke();
  fill(40, 30, 10);
  textAlign(CENTER, CENTER);

  let titleSize = constrain(boxH * 0.065, 14, 22);
  textSize(titleSize);
  text('數學加法挑戰', boxX + boxW / 2, boxY + boxH * 0.12);

  let questionSize = constrain(boxH * 0.12, 20, 38);
  textSize(questionSize);
  textStyle(BOLD);
  text(quizQuestion, boxX + boxW / 2, boxY + boxH * 0.27);
  textStyle(NORMAL);

  // 計算四個選項按鈕位置（2x2 排列）
  optionButtons = [];
  let labels = ['A', 'B', 'C', 'D'];
  let paddingX = boxW * 0.08;
  let gapX = boxW * 0.06;
  let gapY = boxH * 0.05;
  let btnW = (boxW - paddingX * 2 - gapX) / 2;
  let btnH = boxH * 0.19;
  let startY = boxY + boxH * 0.42;

  for (let i = 0; i < 4; i++) {
    let col = i % 2;
    let row = floor(i / 2);
    let bx = boxX + paddingX + col * (btnW + gapX);
    let by = startY + row * (btnH + gapY);

    optionButtons.push({
      x: bx,
      y: by,
      w: btnW,
      h: btnH,
      value: quizOptions[i]
    });

    // 判斷滑鼠是否懸停在按鈕上
    let isHover =
      mouseX >= bx &&
      mouseX <= bx + btnW &&
      mouseY >= by &&
      mouseY <= by + btnH;

    fill(isHover ? color(255, 255, 255, 240) : color(255, 255, 255, 195));
    stroke(180, 140, 20);
    strokeWeight(2);
    rect(bx, by, btnW, btnH, 10);

    noStroke();
    fill(30);
    textSize(constrain(btnH * 0.36, 15, 24));
    text(`${labels[i]}.  ${quizOptions[i]}`, bx + btnW / 2, by + btnH / 2);
  }

  // 顯示作答結果提示
  if (quizFeedback === 'correct') {
    fill(20, 130, 40);
    textStyle(BOLD);
    textSize(constrain(boxH * 0.075, 16, 24));
    text('答對了！太棒了！', boxX + boxW / 2, boxY + boxH * 0.91);
  } else if (quizFeedback === 'wrong') {
    fill(200, 30, 30);
    textStyle(BOLD);
    textSize(constrain(boxH * 0.075, 16, 24));
    text('答錯囉，再試試看！', boxX + boxW / 2, boxY + boxH * 0.91);
  }

  pop();
}

function mousePressed() {
  if (!showQuiz) return;

  for (let btn of optionButtons) {
    if (
      mouseX >= btn.x &&
      mouseX <= btn.x + btn.w &&
      mouseY >= btn.y &&
      mouseY <= btn.y + btn.h
    ) {
      if (btn.value === quizAnswer) {
        quizFeedback = 'correct';
        triggerSpecialEffect('firework', 3000); // 答對：3秒煙火
      } else {
        quizFeedback = 'wrong';
        triggerSpecialEffect('lightning', 3000); // 答錯：3秒閃電
      }
      break;
    }
  }
}

// ==================== 三秒煙火與閃電特效 ====================
function triggerSpecialEffect(type, durationMs) {
  effectType = type;
  effectEndTime = millis() + durationMs;
  fireworks = [];
  nextFireworkSpawn = 0;
}

function updateAndDrawSpecialEffects() {
  if (effectType === 'none') return;

  if (millis() > effectEndTime) {
    effectType = 'none';
    fireworks = [];
    return;
  }

  if (effectType === 'firework') {
    // 定期在畫面上半部隨機施放煙火
    if (millis() >= nextFireworkSpawn) {
      spawnFirework(random(width * 0.15, width * 0.85), random(height * 0.15, height * 0.55));
      nextFireworkSpawn = millis() + 320;
    }
    updateAndDrawFireworks();
  } else if (effectType === 'lightning') {
    drawLightningEffect();
  }
}

function spawnFirework(fx, fy) {
  let baseHue = random(360);
  let count = 45;
  for (let i = 0; i < count; i++) {
    let angle = (TWO_PI / count) * i + random(-0.1, 0.1);
    let speed = random(2, 7.5);
    fireworks.push({
      x: fx,
      y: fy,
      vx: cos(angle) * speed,
      vy: sin(angle) * speed,
      alpha: 255,
      size: random(4, 8),
      r: random(120, 255),
      g: random(100, 255),
      b: random(100, 255)
    });
  }
}

function updateAndDrawFireworks() {
  push();
  noStroke();
  for (let i = fireworks.length - 1; i >= 0; i--) {
    let p = fireworks[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08; // 重力下墜
    p.vx *= 0.98;
    p.alpha -= 4.5;

    if (p.alpha <= 0) {
      fireworks.splice(i, 1);
    } else {
      fill(p.r, p.g, p.b, p.alpha);
      circle(p.x, p.y, p.size);
    }
  }
  pop();
}

function drawLightningEffect() {
  push();
  // 隨機畫面閃白光
  if (random() < 0.35) {
    noStroke();
    fill(220, 235, 255, random(40, 120));
    rectMode(CORNER);
    rect(0, 0, width, height);
  }

  // 隨機產生 1~2 道折線閃電
  if (random() < 0.55) {
    let bolts = floor(random(1, 3));
    for (let b = 0; b < bolts; b++) {
      let lx = random(width * 0.1, width * 0.9);
      let ly = 0;
      let segments = 12;
      let stepY = height / segments;

      // 外層藍紫電光
      stroke(140, 190, 255, 210);
      strokeWeight(8);
      noFill();
      beginShape();
      vertex(lx, ly);
      let pts = [{ x: lx, y: ly }];
      for (let s = 1; s <= segments; s++) {
        lx += random(-45, 45);
        ly = s * stepY;
        vertex(lx, ly);
        pts.push({ x: lx, y: ly });
      }
      endShape();

      // 內層亮白電芯
      stroke(255, 255, 255, 250);
      strokeWeight(3);
      beginShape();
      for (let pt of pts) {
        vertex(pt.x, pt.y);
      }
      endShape();
    }
  }
  pop();
}

// ==================== 角色控制與繪製 ====================
function keyPressed() {
  let groundY = height * 0.75;

  if ((key === ' ' || keyCode === UP_ARROW || key === 'w' || key === 'W') && char1Y >= groundY - 1) {
    char1VY = char1JumpPower;
    char1State = 'jump';
    char1AnimIndex = 0;
  }

  if (key === 'j' || key === 'J' || key === 'z' || key === 'Z') {
    char1State = 'magic';
    char1AnimIndex = 0;
    magicEffectActive = true;
    magicEffectIndex = 0;
    magicEffectX = char1X + char1Facing * 90;
    magicEffectY = char1Y;
  }
}

function updateCharacter1(singleBgWidth, groundY) {
  let moving = false;

  if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) {
    char1X -= char1Speed;
    char1Facing = -1;
    moving = true;
  }
  if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) {
    char1X += char1Speed;
    char1Facing = 1;
    moving = true;
  }

  let maxBoundary = singleBgWidth * 1.45;
  char1X = constrain(char1X, -maxBoundary, maxBoundary);

  char1VY += char1Gravity;
  char1Y += char1VY;

  if (char1Y >= groundY) {
    char1Y = groundY;
    char1VY = 0;
  }

  let prevState = char1State;
  if (char1Y < groundY - 1) {
    char1State = 'jump';
  } else if (char1State === 'magic') {
    if (char1AnimIndex >= CHAR1_SPRITES.magic.frames) {
      char1State = moving ? 'walk' : 'stop';
      char1AnimIndex = 0;
    }
  } else {
    char1State = moving ? 'walk' : 'stop';
  }

  if (prevState !== char1State && char1State !== 'magic') {
    char1AnimIndex = 0;
  }

  char1AnimIndex += char1AnimSpeed;
}

function drawCharacter1() {
  let cfg = CHAR1_SPRITES[char1State];
  let img = char1Imgs[char1State];
  if (!img || !img.width) return;

  let frameW = img.width / cfg.frames;
  let frameH = img.height;
  let currentFrame = floor(char1AnimIndex) % cfg.frames;
  let sx = currentFrame * frameW;

  push();
  translate(char1X, char1Y);
  if (char1Facing === -1) {
    scale(-1, 1);
  }
  image(img, 0, 0, cfg.w, cfg.h, sx, 0, frameW, frameH);
  pop();
}

function drawMagicEffect() {
  if (!magicEffectActive) return;

  let cfg = CHAR1_SPRITES.effect;
  let img = char1Imgs.effect;
  if (!img || !img.width) return;

  magicEffectIndex += 0.25;
  if (magicEffectIndex >= cfg.frames) {
    magicEffectActive = false;
    return;
  }

  let frameW = img.width / cfg.frames;
  let frameH = img.height;
  let currentFrame = floor(magicEffectIndex);
  let sx = currentFrame * frameW;

  push();
  translate(magicEffectX, magicEffectY);
  if (char1Facing === -1) {
    scale(-1, 1);
  }
  image(img, 0, 0, cfg.w, cfg.h, sx, 0, frameW, frameH);
  pop();
}

function drawCharacter2() {
  char2AnimIndex += char2AnimSpeed;

  let isChar1Left = char1X < char2X;

  push();
  translate(char2X, char2Y);
  if (isChar1Left) {
    scale(-1, 1);
  }

  if (char2State === 'stop' && char2StopImg && char2StopImg.width) {
    let currentFrame = floor(char2AnimIndex) % CHAR2_STOP_FRAMES;
    let sx = currentFrame * CHAR2_STOP_W;

    image(
      char2StopImg,
      0, 0,
      CHAR2_STOP_W, CHAR2_STOP_H,
      sx, 0,
      CHAR2_STOP_W, CHAR2_STOP_H
    );
  } else if (char2State === 'action' && char2ActionImg && char2ActionImg.width) {
    let currentFrame = floor(char2AnimIndex) % CHAR2_ACTION_FRAMES;
    let sx = currentFrame * CHAR2_ACTION_W;

    image(
      char2ActionImg,
      0, 0,
      CHAR2_ACTION_W, CHAR2_ACTION_H,
      sx, 0,
      CHAR2_ACTION_W, CHAR2_ACTION_H
    );
  }

  pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}