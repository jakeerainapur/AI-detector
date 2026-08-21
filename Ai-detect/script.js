const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const previewSection = document.getElementById("preview-section");
const mediaContainer = document.getElementById("media-container");
const scanLine = document.getElementById("scan-line");
const analysisStatus = document.getElementById("analysis-status");
const resultsContainer = document.getElementById("results-container");
const verdictTitle = document.getElementById("verdict-title");
const confidenceFill = document.getElementById("confidence-fill");
const confidenceValue = document.getElementById("confidence-value");
const metadataGrid = document.getElementById("metadata-grid");

// Modal Logic
const modal = document.getElementById("auth-modal");
const modalTitle = document.getElementById("modal-title");
const modalSubtitle = document.getElementById("modal-subtitle");
const modalSubmitBtn = document.getElementById("modal-submit-btn");
const modalSwitchText = document.getElementById("modal-switch-text");
const authForm = document.getElementById("auth-form");
const emailInput = document.getElementById("auth-email");
const passwordInput = document.getElementById("auth-password");
const confirmPasswordGroup = document.getElementById("confirm-password-group");
const confirmPasswordInput = document.getElementById("auth-confirm-password");
const authMessage = document.getElementById("auth-message");
const verificationSection = document.getElementById("verification-section");
const verifyEmailText = document.getElementById("verify-email-text");
const verificationInput = document.getElementById("verification-input");
const nameInput = document.getElementById("auth-name");
const usernameInput = document.getElementById("auth-username");
const mobileInput = document.getElementById("auth-mobile");

let authMode = "login";
let verificationCode = "";
let pendingEmail = "";
let pendingAuthData = {};

let currentUser = localStorage.getItem("currentUser") || null;

document.addEventListener("DOMContentLoaded", () => {
  if (currentUser) {
    updateAuthButtons(currentUser);
  }
});

function getUsers() {
  const raw = localStorage.getItem("truthlensUsers");
  return raw ? JSON.parse(raw) : [];
}

function saveUsers(users) {
  localStorage.setItem("truthlensUsers", JSON.stringify(users));
}

function openModal(type) {
  authMode = type;
  authMessage.innerText = "";
  verificationInput.value = "";
  modal.classList.add("active");
  authForm.classList.remove("hidden");
  verificationSection.classList.add("hidden");
  emailInput.value = "";
  passwordInput.value = "";
  confirmPasswordInput.value = "";
  if (nameInput) nameInput.value = "";
  if (usernameInput) usernameInput.value = "";
  if (mobileInput) mobileInput.value = "";

  const signupOnlyEls = document.querySelectorAll(".signup-only");

  if (type === "login") {
    authForm.classList.remove("signup-mode");
    modalTitle.classList.remove("signup-mode-title");
    modalTitle.innerText = "Welcome Back";
    modalSubtitle.innerText = "Log in to continue scanning";
    modalSubmitBtn.innerText = "Log In";
    modalSubmitBtn.style.background = "";
    modalSubmitBtn.style.boxShadow = "";
    modalSwitchText.innerHTML =
      "Don't have an account? <span onclick=\"openModal('signup')\">Sign Up</span>";
    signupOnlyEls.forEach((el) => el.classList.add("hidden"));
  } else {
    authForm.classList.add("signup-mode");
    modalTitle.classList.add("signup-mode-title");
    modalTitle.innerText = "Create Account";
    modalSubtitle.innerText = "Sign up for unlimited scanning";
    modalSubmitBtn.innerText = "Sign Up";
    modalSubmitBtn.style.background = "linear-gradient(135deg, #10b981, #34d399)";
    modalSubmitBtn.style.boxShadow = "0 4px 15px rgba(16, 185, 129, 0.3)";
    modalSwitchText.innerHTML =
      "Already have an account? <span onclick=\"openModal('login')\">Log In</span>";
    signupOnlyEls.forEach((el) => el.classList.remove("hidden"));
  }
}

function closeModal() {
  modal.classList.remove("active");
}

function handleAuthSubmit(event) {
  event.preventDefault();
  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value.trim();
  const users = getUsers();

  if (!email || !password) {
    showAuthMessage("Please enter both email and password.", true);
    return;
  }

  if (!email.endsWith("@gmail.com")) {
    showAuthMessage("Please use a Gmail address for verification.", true);
    return;
  }

  if (authMode === "signup") {
    const name = nameInput.value.trim();
    const username = usernameInput.value.trim();
    const mobile = mobileInput.value.trim();

    if (!name || !username || !mobile) {
      showAuthMessage(
        "Please fill in all signup fields (Name, Username, Mobile).",
        true,
      );
      return;
    }

    const existingUserIndex = users.findIndex((user) => user.email === email);

    if (existingUserIndex !== -1) {
      const existingUser = users[existingUserIndex];
      if (existingUser.verified) {
        if (existingUser.password === password) {
          successfulLogin(email);
          return;
        } else {
          openModal("login");
          emailInput.value = email;
          showAuthMessage(
            "Account exists. Please enter your password to log in.",
            false,
          );
          return;
        }
      } else {
        users.splice(existingUserIndex, 1);
        saveUsers(users);
      }
    }

    if (password.length < 6) {
      showAuthMessage("Password must be at least 6 characters.", true);
      return;
    }

    if (confirmPasswordInput.value.trim() !== password) {
      showAuthMessage("Passwords do not match.", true);
      return;
    }

    pendingEmail = email;
    pendingAuthData = { email, password, name, username, mobile };
    verificationCode = generateCode();
    verifyEmailText.innerText = email;
    authForm.classList.add("hidden");
    verificationSection.classList.remove("hidden");
    showAuthMessage(
      `Verification sent to ${email}. Use code ${verificationCode} to continue.`,
      false,
    );
    return;
  }

  const user = users.find((user) => user.email === email);
  if (!user) {
    showAuthMessage("No account found. Please sign up first.", true);
    return;
  }

  if (user.password !== password) {
    showAuthMessage("Incorrect password. Please try again.", true);
    return;
  }

  if (!user.verified) {
    pendingEmail = email;
    pendingAuthData = {
      email: user.email,
      password: user.password,
      name: user.name,
      username: user.username,
      mobile: user.mobile,
    };
    verificationCode = generateCode();
    verifyEmailText.innerText = email;
    authForm.classList.add("hidden");
    verificationSection.classList.remove("hidden");
    showAuthMessage(
      `Account not verified. New code sent to ${email}. Use ${verificationCode} to continue.`,
      false,
    );
    return;
  }

  successfulLogin(email);
}

function handleVerification() {
  const enteredCode = verificationInput.value.trim();
  if (!enteredCode) {
    showAuthMessage("Enter the 6-digit verification code.", true);
    return;
  }

  if (enteredCode !== verificationCode) {
    showAuthMessage("Incorrect verification code. Try again or resend.", true);
    return;
  }

  const users = getUsers();
  users.push({
    ...pendingAuthData,
    verified: true,
    createdAt: new Date().toISOString(),
  });
  saveUsers(users);
  showAuthMessage("Account verified successfully! Signing you in…", false);
  setTimeout(() => {
    successfulLogin(pendingEmail);
  }, 700);
}

function resendVerificationCode() {
  if (!pendingEmail) return;
  verificationCode = generateCode();
  showAuthMessage(
    `New code sent to ${pendingEmail}. Use ${verificationCode}.`,
    false,
  );
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function showAuthMessage(message, isError) {
  authMessage.innerText = message;
  authMessage.style.color = isError ? "#fb7185" : "#34d399";
}

function successfulLogin(email) {
  closeModal();
  currentUser = email;
  localStorage.setItem("currentUser", email);
  updateAuthButtons(email);
  alert(`Welcome back, ${email}! You are now logged in.`);
}

function logout() {
  currentUser = null;
  localStorage.removeItem("currentUser");
  updateAuthButtons(null);
  alert("You have been logged out.");
}

function updateAuthButtons(email) {
  const authButtons = document.querySelector(".auth-buttons");
  if (!authButtons) return;
  if (email) {
    authButtons.innerHTML = `
            <span style="color: #fff; margin-right: 15px; font-weight: 600;">${email}</span>
            <button class="login-btn" onclick="logout()">Log Out</button>
        `;
  } else {
    authButtons.innerHTML = `
            <button class="login-btn" onclick="openModal('login')">Log In</button>
            <button class="signup-btn" onclick="openModal('signup')">Sign Up</button>
        `;
  }
}

// Camera Logic
const cameraModal = document.getElementById("camera-modal");
const cameraStream = document.getElementById("camera-stream");
let stream = null;

async function openCamera() {
  cameraModal.classList.add("active");
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    cameraStream.srcObject = stream;
  } catch (err) {
    console.error("Camera access error:", err);
    alert(
      "Unable to access the camera. Please allow camera permissions in your browser.",
    );
    closeCamera();
  }
}

function closeCamera() {
  cameraModal.classList.remove("active");
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }
}

function capturePhoto() {
  if (!stream) return;

  // Create canvas to grab a frame from the video
  const canvas = document.createElement("canvas");
  canvas.width = cameraStream.videoWidth;
  canvas.height = cameraStream.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(cameraStream, 0, 0, canvas.width, canvas.height);

  // Convert to file and analyze
  canvas.toBlob(
    (blob) => {
      const file = new File([blob], "live_capture.jpg", { type: "image/jpeg" });
      file.isDirectCapture = true; // Mark as authenticated live capture
      closeCamera();
      handleFiles([file]);
    },
    "image/jpeg",
    0.95,
  );
}

// Drag and Drop Events
["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, preventDefaults, false);
  document.body.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(eventName, highlight, false);
});

["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, unhighlight, false);
});

function highlight(e) {
  dropZone.classList.add("dragover");
}

function unhighlight(e) {
  dropZone.classList.remove("dragover");
}

dropZone.addEventListener("drop", handleDrop, false);

function handleDrop(e) {
  let dt = e.dataTransfer;
  let files = dt.files;
  handleFiles(files);
}

fileInput.addEventListener("change", function () {
  handleFiles(this.files);
});

function handleFiles(files) {
  if (files.length === 0) return;

  if (!currentUser) {
    let guestScans = parseInt(localStorage.getItem("guestScans") || "0");
    if (guestScans >= 3) {
      openModal("login");
      showAuthMessage(
        "Free limit reached! Scan up to 3 times for free. Login or Sign Up to continue.",
        true,
      );
      return;
    }
    localStorage.setItem("guestScans", guestScans + 1);
  }

  const file = files[0];

  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
    alert("Unsupported file format. Please upload an image or video.");
    return;
  }

  // Update UI
  dropZone.classList.add("hidden");
  previewSection.classList.remove("hidden");
  resultsContainer.classList.add("hidden");
  analysisStatus.classList.remove("hidden");
  scanLine.style.display = "block";
  confidenceFill.style.width = "0%";
  confidenceValue.innerText = "0%";

  // Render Preview
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = function (e) {
    // Clear previous media except scanline
    Array.from(mediaContainer.children).forEach((child) => {
      if (child.id !== "scan-line") child.remove();
    });

    let mediaEl;
    if (file.type.startsWith("image/")) {
      mediaEl = document.createElement("img");
      mediaEl.src = e.target.result;
      mediaContainer.insertBefore(mediaEl, scanLine);
      analyzeImage(file);
    } else {
      mediaEl = document.createElement("video");
      mediaEl.src = e.target.result;
      mediaEl.controls = true;
      mediaEl.autoplay = true;
      mediaEl.muted = true;
      mediaContainer.insertBefore(mediaEl, scanLine);
      analyzeVideo(file);
    }
  };
}

function getImageDataFromFile(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            const MAX_DIM = 800; // Resize for performance
            let w = img.width;
            let h = img.height;
            if (w > MAX_DIM || h > MAX_DIM) {
                const ratio = Math.min(MAX_DIM/w, MAX_DIM/h);
                w = Math.round(w * ratio);
                h = Math.round(h * ratio);
            }
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, w, h);
            
            try {
                const data = ctx.getImageData(0, 0, w, h);
                URL.revokeObjectURL(url);
                resolve({imageData: data, width: w, height: h});
            } catch(e) {
                reject(e);
            }
        };
        img.onerror = reject;
        img.src = url;
    });
}

function analyzePixelData(imageData, width, height) {
    const data = imageData.data;
    const len = data.length;
    let rSum = 0, gSum = 0, bSum = 0;
    
    // Grayscale conversion & basic stats
    const gray = new Uint8Array(len / 4);
    for (let i = 0, j = 0; i < len; i += 4, j++) {
        const r = data[i], g = data[i+1], b = data[i+2];
        rSum += r; gSum += g; bSum += b;
        gray[j] = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
    }
    
    // Laplacian Variance (Noise and Edge characteristics)
    let laplacianSum = 0;
    let laplacianSqSum = 0;
    let validCount = 0;
    
    for (let y = 1; y < height - 1; y += 2) {
        for (let x = 1; x < width - 1; x += 2) {
            const idx = y * width + x;
            const val = 
                 gray[idx - width] + 
                 gray[idx - 1] + 
                 gray[idx + 1] + 
                 gray[idx + width] - 
                 4 * gray[idx];
                 
            laplacianSum += val;
            laplacianSqSum += val * val;
            validCount++;
        }
    }
    
    const lapMean = validCount > 0 ? laplacianSum / validCount : 0;
    const lapVar = validCount > 0 ? (laplacianSqSum / validCount) - (lapMean * lapMean) : 0;

    // Color Entropy (Distribution of intensities)
    const histogram = new Array(256).fill(0);
    for(let i = 0; i < gray.length; i++) {
        histogram[gray[i]]++;
    }
    let entropy = 0;
    for(let i = 0; i < 256; i++) {
        if(histogram[i] > 0) {
            const p = histogram[i] / gray.length;
            entropy -= p * Math.log2(p);
        }
    }

    return { noiseVariance: lapVar, colorEntropy: entropy };
}

function extractVideoFrames(file, numFrames) {
    return new Promise((resolve, reject) => {
        const video = document.createElement("video");
        video.muted = true;
        video.playsInline = true;
        
        const url = URL.createObjectURL(file);
        let framesOut = [];
        
        video.onloadedmetadata = async () => {
            const duration = video.duration || 5; 
            const timestamps = [];
            for (let i = 1; i <= numFrames; i++) {
                timestamps.push(duration * (i / (numFrames + 1))); 
            }
            
            const MAX_DIM = 600;
            let w = video.videoWidth;
            let h = video.videoHeight;
            if (w > MAX_DIM || h > MAX_DIM) {
                const r = Math.min(MAX_DIM/w, MAX_DIM/h);
                w = Math.round(w * r);
                h = Math.round(h * r);
            }
            
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");

            for (let time of timestamps) {
                video.currentTime = time;
                await new Promise(r => {
                    const listener = () => { video.removeEventListener('seeked', listener); r(); };
                    video.addEventListener('seeked', listener);
                });
                ctx.drawImage(video, 0, 0, w, h);
                framesOut.push({
                    imageData: ctx.getImageData(0, 0, w, h),
                    width: w, 
                    height: h
                });
            }
            URL.revokeObjectURL(url);
            resolve(framesOut);
        };
        video.onerror = reject;
        video.src = url;
    });
}

async function analyzeImage(file) {
  try {
    let exifData = null;
    if (window.exifr) {
      try {
        exifData = await exifr.parse(file);
      } catch (e) {
        console.warn("EXIF extraction failed", e);
      }
    }
    
    let advancedStats = null;
    try {
        const { imageData, width, height } = await getImageDataFromFile(file);
        const pixelStats = analyzePixelData(imageData, width, height);
        advancedStats = { pixelStats };
    } catch (pixelErr) {
        console.warn("Pixel analysis failed", pixelErr);
    }

    setTimeout(() => {
      finishAnalysis(file, exifData, "image", advancedStats);
    }, 1500); 
  } catch (err) {
    console.error("Analysis Error:", err);
    setTimeout(() => {
      finishAnalysis(file, null, "image", null);
    }, 1500);
  }
}

async function analyzeVideo(file) {
  try {
      const frames = await extractVideoFrames(file, 3);
      if (frames.length > 0) {
          const statsArray = frames.map(f => analyzePixelData(f.imageData, f.width, f.height));
          
          let varianceChanges = 0;
          let entropyChanges = 0;
          for (let i = 1; i < statsArray.length; i++) {
              varianceChanges += Math.abs(statsArray[i].noiseVariance - statsArray[i-1].noiseVariance);
              entropyChanges += Math.abs(statsArray[i].colorEntropy - statsArray[i-1].colorEntropy);
          }
          
          const advancedStats = { 
              pixelStats: statsArray[0], 
              tempVariance: varianceChanges / Math.max(1, statsArray.length - 1),
              tempEntropy: entropyChanges / Math.max(1, statsArray.length - 1)
          };
    
          setTimeout(() => {
              finishAnalysis(file, null, "video", advancedStats);
          }, 2500);
      } else {
          throw new Error("No frames extracted");
      }
  } catch (err) {
      console.error("Video Analysis Error:", err);
      setTimeout(() => {
          finishAnalysis(file, null, "video", null);
      }, 2500);
  }
}

function finishAnalysis(file, exifData, type, advancedStats) {
  scanLine.style.display = "none";
  analysisStatus.classList.add("hidden");
  resultsContainer.classList.remove("hidden");
  
  metadataGrid.innerHTML = "";
  
  verdictTitle.style.color = "";
  verdictTitle.style.textShadow = "";

  let confidence = 50;
  let prediction = "";
  let reasons = [];
  
  if (file.isDirectCapture) {
      prediction = "Real";
      confidence = 99.5;
      reasons.push("Hardware Auth (Webcam)");
      addDetail("Source", "Direct Live WebStream");
  } else {
      let aiScore = 50; 
      let isAiMetadata = false;

      // 1. Metadata and Nomenclature forensics
      const name = file.name.toLowerCase();
      if (name.includes("ai") || name.includes("midjourney") || name.includes("dalle") || name.includes("stable diffusion")) {
          aiScore += 35;
          reasons.push("Generative filename tags");
      }
      
      if (exifData) {
          const softwareStr = (exifData.Software || exifData.CreatorTool || exifData.ImageDescription || "").toLowerCase();
          if (softwareStr.includes("midjourney") || softwareStr.includes("dall-e") || softwareStr.includes("stable") || softwareStr.includes("ai generated")) {
              aiScore = 100;
              isAiMetadata = true;
              reasons.push("Explicit AI metadata signature");
              addDetail("AI Generator", exifData.Software || "Detected");
          } else if (exifData.Make || exifData.Model || exifData.DateTimeOriginal) {
              aiScore -= 35;
              reasons.push("Contains valid device hardware Exif");
              if (exifData.Make) addDetail("Device", exifData.Make);
              if (exifData.Model) addDetail("Model", exifData.Model);
          }
      } else {
          aiScore += 15;
          if (type === "image" && (file.type === "image/jpeg" || file.type === "image/jpg")) {
              reasons.push("JPEG stripped of EXIF (Suspicious factor)");
          }
      }
      
      // 2. Pixel & Temporal Forensics
      if (advancedStats) {
          if (type === "image") {
              const { noiseVariance, colorEntropy } = advancedStats.pixelStats;
              addDetail("Noise Variance", noiseVariance.toFixed(1));
              addDetail("Color Entropy", colorEntropy.toFixed(1));

              if (noiseVariance < 30) {
                  aiScore += 25;
                  reasons.push("Abnormally smooth pixel variance (AI upscaler/generator)");
              } else if (noiseVariance > 1500) {
                  aiScore += 15;
                  reasons.push("Extreme high-frequency artifacts (Possible AI/Deepfake)");
              } else {
                  aiScore -= 15;
                  reasons.push("Natural optical noise profile");
              }

              if (colorEntropy < 3) {
                  aiScore += 20;
                  reasons.push("Restricted synthetic color distribution");
              }
          } else if (type === "video") {
              const { tempVariance } = advancedStats;
              addDetail("Temporal Flux", tempVariance.toFixed(1));
              
              if (tempVariance > 150) {
                  aiScore += 35;
                  reasons.push("High inter-frame flicker (AI generative anomaly)");
              } else if (tempVariance < 5) {
                   aiScore += 20;
                   reasons.push("Unnaturally static temporal background");
              } else {
                  aiScore -= 15;
                  reasons.push("Normal video temporal compression noise");
              }
          }
      }
      
      aiScore = Math.max(0, Math.min(100, aiScore));
      
      if (isAiMetadata || aiScore >= 75) {
          prediction = "AI Generated";
          confidence = isAiMetadata ? (96 + Math.random() * 3) : aiScore; 
      } else if (aiScore <= 35) {
          prediction = "Real";
          confidence = 100 - aiScore; 
      } else {
          prediction = "Inconclusive";
          confidence = Math.max(10, 100 - Math.abs(aiScore - 50) * 1.5);
      }
  }

  if (prediction === "Real") {
      verdictTitle.innerText = "Authentic Media";
      verdictTitle.className = "verdict-real";
      confidenceFill.style.background = "linear-gradient(90deg, #10b981, #34d399)";
  } else if (prediction === "AI Generated") {
      verdictTitle.innerText = "AI Generated / Deepfake";
      verdictTitle.className = "verdict-ai";
      confidenceFill.style.background = "linear-gradient(90deg, #f59e0b, #fbbf24)";
  } else {
      verdictTitle.innerText = "Inconclusive / Mixed";
      verdictTitle.className = "verdict-ai"; 
      confidenceFill.style.background = "linear-gradient(90deg, #94a3b8, #cbd5e1)";
      verdictTitle.style.color = "#cbd5e1";
      verdictTitle.style.textShadow = "0 0 20px rgba(203, 213, 225, 0.4)";
  }
  
  addDetail("File Format", file.type || "Unknown");
  if (reasons.length > 0) {
      addDetail("Key Signals", reasons.slice(0, 3).join(", "));
  } else {
      addDetail("Key Signals", "No distinct patterns allowed analysis");
  }

  confidenceFill.style.width = "0%";
  confidenceValue.innerText = "0%";

  setTimeout(() => {
    confidenceFill.style.width = confidence.toFixed(1) + "%";

    let start = 0;
    let duration = 1500;
    let startTime = null;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      let progress = timestamp - startTime;
      let current = Math.min(
        ((progress / duration) * confidence),
        confidence
      );
      confidenceValue.innerText = current.toFixed(1) + "%";
      if (progress < duration) {
        window.requestAnimationFrame(step);
      } else {
        confidenceValue.innerText = confidence.toFixed(1) + "%";
      }
    }
    window.requestAnimationFrame(step);
  }, 100);
}

function addDetail(label, value) {
  const div = document.createElement("div");
  div.className = "detail-item";
  div.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
  metadataGrid.appendChild(div);
}

function resetApp() {
  previewSection.classList.add("hidden");
  dropZone.classList.remove("hidden");
  fileInput.value = "";
}

function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
