<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MedQuiz Webcam - 3D PWA</title>
    
    <!-- Configurações PWA -->
    <link rel="manifest" href="manifest.json">
    <meta name="theme-color" content="#ccff00">
    <link rel="apple-touch-icon" href="icon.png">

    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Three.js e GLTFLoader -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>

    <!-- MediaPipe Hands e Drawing Utils -->
    <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" crossorigin="anonymous"></script>
    <script src="https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js" crossorigin="anonymous"></script>
    <script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js" crossorigin="anonymous"></script>

    <!-- Canvas Confetti para VFX de acerto -->
    <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>

    <style>
        body { background-color: #18181b; color: #f4f4f5; font-family: system-ui, -apple-system, sans-serif; overflow: hidden; }
        .neon-btn { background: #ccff00; color: #000; font-weight: 800; transition: all 0.2s; }
        .neon-btn:hover { background: #b3e600; transform: scale(1.02); }
        .cursor-pointer-custom { pointer-events: auto; }

        /* Animações fluidas em escadinha e centralizadas (Juice) */
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(30px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes popUp {
            0% { opacity: 0; transform: scale(0.8); }
            100% { opacity: 1; transform: scale(1); }
        }
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-10px); }
            40%, 80% { transform: translateX(10px); }
        }
        .animate-question { animation: popUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-option-1 { opacity: 0; animation: fadeInUp 0.4s 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-option-2 { opacity: 0; animation: fadeInUp 0.4s 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-option-3 { opacity: 0; animation: fadeInUp 0.4s 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-option-4 { opacity: 0; animation: fadeInUp 0.4s 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-shake { animation: shake 0.4s ease-in-out; }
        .animate-modal-in { animation: popUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
    </style>
</head>
<body class="h-screen w-screen flex flex-col justify-between relative select-none">

    <!-- CANVAS GLOBAL PARA O ESQUELETO DA MÃO -->
    <canvas id="global-hand-canvas" class="absolute inset-0 w-full h-full pointer-events-none z-30"></canvas>

    <!-- TELA DO JOGO / 3D / QUIZ -->
    <div id="screen-game" class="h-full w-full flex flex-col justify-between p-4 relative z-10">
        
        <!-- Top bar -->
        <div class="flex justify-between items-center z-40 pointer-events-auto">
            <h1 class="text-xl font-black tracking-wider text-white">MED <span class="text-[#ccff00]">QUIZ</span> 3D</h1>
            <div class="flex gap-2">
                <button id="btn-reset-scene" class="bg-[#ccff00] text-black font-black p-3 rounded-xl shadow cursor-pointer-custom">RESETAR CENA</button>
            </div>
        </div>

        <!-- Container do Modelo 3D -->
        <div id="canvas-container" class="absolute inset-0 z-0 pointer-events-auto"></div>

        <!-- Categorias na Vertical à Direita com Padding -->
        <div id="categories-container" class="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-40 p-6 pointer-events-auto">
            <button onclick="selectCategory(0)" class="neon-btn px-6 py-4 rounded-2xl shadow-xl text-base text-right tracking-wide cursor-pointer-custom">Aorta</button>
            <button onclick="selectCategory(1)" class="neon-btn px-6 py-4 rounded-2xl shadow-xl text-base text-right tracking-wide cursor-pointer-custom">Artéria Pulmonar</button>
            <button onclick="selectCategory(2)" class="neon-btn px-6 py-4 rounded-2xl shadow-xl text-base text-right tracking-wide cursor-pointer-custom">Coração Corpo</button>
        </div>

        <!-- Quiz Container Centralizado -->
        <div id="quiz-container" class="hidden absolute inset-0 m-auto flex flex-col justify-center items-center gap-4 z-40 max-w-xl w-full p-6 pointer-events-auto">
            <div id="question-box" class="bg-zinc-900/95 border-2 border-[#ccff00] p-6 rounded-2xl text-center font-bold text-base text-white shadow-2xl animate-question w-full">
                Pergunta aqui...
            </div>
            <div class="flex flex-col gap-3 w-full" id="options-grid">
                <!-- Alternativas injetadas com classes de animação -->
            </div>
        </div>

        <!-- Rodapé com Câmera Reduzida -->
        <div class="flex justify-between items-end z-40 pointer-events-none">
            <div class="relative w-40 h-28 rounded-xl overflow-hidden border-2 border-[#ccff00] shadow-xl bg-black">
                <video id="webcam-live" class="w-full h-full object-cover transform -scale-x-100" autoplay playsinline muted></video>
            </div>
            
            <div class="bg-black/90 border border-[#ccff00] px-4 py-2 rounded-xl text-center pointer-events-auto">
                <span class="text-xs text-zinc-400 block font-bold">ESTADO DO GESTO</span>
                <span id="gesture-status" class="text-lg font-black text-[#ccff00]">NENHUM</span>
            </div>
        </div>
    </div>

    <!-- MODAL DE FEEDBACK (ACERTO / ERRO) COM ANIMAÇÃO E SHAKE -->
    <div id="feedback-modal" class="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center hidden pointer-events-auto">
        <div id="modal-card" class="bg-zinc-900 border-4 border-[#ccff00] p-8 rounded-3xl text-center shadow-2xl max-w-md w-full animate-modal-in">
            <h2 id="modal-title" class="text-3xl font-black mb-2 uppercase tracking-wide">ACERTOU!</h2>
            <p id="modal-desc" class="text-zinc-300 font-semibold text-sm">Parabéns pelo excelente desempenho anatômico.</p>
        </div>
    </div>

    <!-- Bolinha de Raycast (Disparo) na ponta do dedo indicador -->
    <div id="raycast-dot" class="absolute w-5 h-5 bg-[#ccff00] border-2 border-black rounded-full -translate-x-1/2 -translate-y-1/2 shadow-2xl hidden z-50 pointer-events-none"></div>

    <!-- Barra de Cooldown de 1 segundo ao apontar -->
    <div id="cooldown-bar-container" class="absolute top-0 left-0 w-full h-2 bg-transparent z-50 overflow-hidden hidden">
        <div id="cooldown-bar" class="h-full bg-[#ccff00] w-0 transition-all duration-75"></div>
    </div>

    <video id="webcam-source" class="hidden" autoplay playsinline muted></video>

    <script>
        let currentScreen = 'parts';
        let currentGesture = 'NONE';
        
        const quizData = [
            {
                partName: "Aorta",
                question: "Qual é a principal artéria do corpo humano que transporta sangue oxigenado a partir do ventrículo esquerdo?",
                options: ["Veia Cava Superior", "Artéria Aorta", "Artéria Pulmonar", "Seio Coronário"],
                correct: 1
            },
            {
                partName: "Artéria Pulmonar",
                question: "Durante a abordagem cirúrgica da base do coração, qual grande vaso sanguíneo emerge diretamente do ventrículo direito?",
                options: ["Veia Cava Superior", "Artéria Subclávia Esquerda", "Tronco da Artéria Pulmonar", "Seio Coronário"],
                correct: 2
            },
            {
                partName: "Coração Corpo",
                question: "O miocárdio, camada muscular espessa responsável pela contração do coração, é mais espesso em qual das cavidades?",
                options: ["Átrio Direito", "Ventrículo Esquerdo", "Átrio Esquerdo", "Ventrículo Direito"],
                correct: 1
            }
        ];

        let activeQuizIndex = 0;

        // --- THREE.JS SETUP ---
        let scene, camera, renderer, heartModel;

        function init3D() {
            const container = document.getElementById('canvas-container');
            scene = new THREE.Scene();

            camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.set(0, 0, 7);

            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            container.appendChild(renderer.domElement);

            const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
            scene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
            directionalLight.position.set(5, 10, 7);
            scene.add(directionalLight);

            const backLight = new THREE.DirectionalLight(0x990000, 1.5);
            backLight.position.set(-5, -5, -5);
            scene.add(backLight);

            loadHeartGLB();
            animate3D();
            window.addEventListener('resize', onWindowResize);
        }

        function loadHeartGLB() {
            const loader = new THREE.GLTFLoader();
            loader.load(
                'coracao.glb',
                function (gltf) {
                    if (heartModel) scene.remove(heartModel);
                    heartModel = gltf.scene;

                    const box = new THREE.Box3().setFromObject(heartModel);
                    const center = box.getCenter(new THREE.Vector3());
                    const size = box.getSize(new THREE.Vector3());
                    const maxDim = Math.max(size.x, size.y, size.z);
                    const scale = 3.0 / maxDim;
                    heartModel.scale.set(scale, scale, scale);
                    heartModel.position.sub(center.multiplyScalar(scale));

                    scene.add(heartModel);
                },
                undefined,
                function (error) {
                    createDetailedProceduralHeart();
                }
            );
        }

        function createDetailedProceduralHeart() {
            if (heartModel) scene.remove(heartModel);
            heartModel = new THREE.Group();

            const bodyGeo = new THREE.SphereGeometry(1.4, 32, 32);
            bodyGeo.scale(1, 1.25, 0.85);
            const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.25, metalness: 0.15 });
            const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
            heartModel.add(bodyMesh);

            const aortaGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.8, 16);
            const aortaMat = new THREE.MeshStandardMaterial({ color: 0xfecdd3, roughness: 0.2 });
            const aortaMesh = new THREE.Mesh(aortaGeo, aortaMat);
            aortaMesh.position.set(0, 1.2, 0);
            aortaMesh.rotation.z = -0.2;
            heartModel.add(aortaMesh);

            const pulmGeo = new THREE.CylinderGeometry(0.26, 0.26, 1.5, 16);
            const pulmMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.3 });
            const pulmMesh = new THREE.Mesh(pulmGeo, pulmMat);
            pulmMesh.position.set(-0.6, 0.8, 0.4);
            pulmMesh.rotation.z = 0.4;
            heartModel.add(pulmMesh);

            scene.add(heartModel);
        }

        function animate3D() {
            requestAnimationFrame(animate3D);
            if (renderer && scene && camera) {
                renderer.render(scene, camera);
            }
        }

        function onWindowResize() {
            if (!camera || !renderer) return;
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        // --- MEDIPIPE & ESQUELETO NA TELA TODA ---
        const videoElement = document.getElementById('webcam-source');
        const webcamLive = document.getElementById('webcam-live');
        const globalHandCanvas = document.getElementById('global-hand-canvas');
        const canvasCtx = globalHandCanvas.getContext('2d');

        function initWebcam() {
            const hands = new Hands({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
            });

            hands.setOptions({
                maxNumHands: 1,
                modelComplexity: 1,
                minDetectionConfidence: 0.6,
                minTrackingConfidence: 0.6
            });

            hands.onResults(onHandResults);

            const cameraUtils = new Camera(videoElement, {
                onFrame: async () => {
                    await hands.send({ image: videoElement });
                },
                width: 640,
                height: 480
            });
            cameraUtils.start();

            navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
                webcamLive.srcObject = stream;
            }).catch(err => console.log("Erro na webcam:", err));
        }

        let lastHandX = 0, lastHandY = 0;
        let focusedElement = null;
        let hoverStartTime = 0;
        const hoverDuration = 1000;

        function onHandResults(results) {
            const statusEl = document.getElementById('gesture-status');
            const raycastDot = document.getElementById('raycast-dot');

            globalHandCanvas.width = window.innerWidth;
            globalHandCanvas.height = window.innerHeight;
            canvasCtx.clearRect(0, 0, globalHandCanvas.width, globalHandCanvas.height);

            if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
                currentGesture = 'NONE';
                statusEl.innerText = "NENHUMA MÃO";
                raycastDot.style.display = 'none';
                resetHover();
                return;
            }

            const landmarks = results.multiHandLandmarks[0];

            canvasCtx.save();
            canvasCtx.translate(globalHandCanvas.width, 0);
            canvasCtx.scale(-1, 1);
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: '#ccff00', lineWidth: 3 });
            drawLandmarks(canvasCtx, landmarks, { color: '#ffffff', lineWidth: 1, radius: 4 });
            canvasCtx.restore();

            const isIndexExtended = landmarks[8].y < landmarks[6].y;
            const isMiddleClosed = landmarks[12].y > landmarks[10].y;
            const isRingClosed = landmarks[16].y > landmarks[14].y;
            const isPinkyClosed = landmarks[20].y > landmarks[18].y;

            const isFist = !isIndexExtended && isMiddleClosed && isRingClosed && isPinkyClosed;
            const isPointing = isIndexExtended && isMiddleClosed && isRingClosed;

            if (isFist) {
                currentGesture = 'CLOSED_FIST';
                statusEl.innerText = "FECHAR A MÃO (ROTAÇÃO)";
                raycastDot.style.display = 'none';
                resetHover();

                const handX = landmarks[9].x;
                const handY = landmarks[9].y;
                if (lastHandX !== 0 && heartModel) {
                    const deltaX = handX - lastHandX;
                    const deltaY = handY - lastHandY;
                    heartModel.rotation.y -= deltaX * 5;
                    heartModel.position.y -= deltaY * 3;
                }
                lastHandX = handX;
                lastHandY = handY;

            } else if (isPointing) {
                currentGesture = 'POINTING';
                statusEl.innerText = "APONTAR (DISPARO)";
                raycastDot.style.display = 'block';
                lastHandX = 0;

                const indicatorX = (1 - landmarks[8].x) * window.innerWidth;
                const indicatorY = landmarks[8].y * window.innerHeight;

                raycastDot.style.left = `${indicatorX}px`;
                raycastDot.style.top = `${indicatorY}px`;

                checkElementUnderCursor(indicatorX, indicatorY);
            } else {
                currentGesture = 'NONE';
                statusEl.innerText = "NEUTRO";
                raycastDot.style.display = 'none';
                resetHover();
                lastHandX = 0;
            }
        }

        function checkElementUnderCursor(x, y) {
            const cooldownBar = document.getElementById('cooldown-bar');
            const cooldownContainer = document.getElementById('cooldown-bar-container');

            const elementsUnderPoint = document.elementsFromPoint(x, y);
            let targetButton = elementsUnderPoint.find(el => el.tagName === 'BUTTON');

            if (targetButton) {
                if (focusedElement !== targetButton) {
                    focusedElement = targetButton;
                    hoverStartTime = Date.now();
                    cooldownContainer.style.display = 'block';
                } else {
                    let elapsed = Date.now() - hoverStartTime;
                    let progress = Math.min((elapsed / hoverDuration) * 100, 100);
                    cooldownBar.style.width = `${progress}%`;

                    if (elapsed >= hoverDuration) {
                        targetButton.click();
                        resetHover();
                    }
                }
            } else {
                resetHover();
            }
        }

        function resetHover() {
            focusedElement = null;
            hoverStartTime = 0;
            const cooldownContainer = document.getElementById('cooldown-bar-container');
            const cooldownBar = document.getElementById('cooldown-bar');
            if (cooldownContainer) cooldownContainer.style.display = 'none';
            if (cooldownBar) cooldownBar.style.width = '0%';
        }

        document.getElementById('btn-reset-scene').addEventListener('click', () => {
            if (heartModel) {
                heartModel.rotation.set(0, 0, 0);
                heartModel.position.set(0, 0, 0);
            }
        });

        // Selecionar categoria com quiz centralizado e animação em escadinha
        function selectCategory(index) {
            const selectedQuestion = quizData[index];
            currentScreen = 'quiz';

            document.getElementById('categories-container').classList.add('hidden');
            document.getElementById('quiz-container').classList.remove('hidden');

            document.getElementById('question-box').innerText = selectedQuestion.question;
            const grid = document.getElementById('options-grid');
            grid.innerHTML = '';

            selectedQuestion.options.forEach((opt, i) => {
                const btn = document.createElement('button');
                btn.className = `neon-btn p-4 rounded-xl font-bold text-left flex items-center justify-between shadow-md cursor-pointer-custom animate-option-${i+1}`;
                btn.innerHTML = `<span><strong class="mr-2">${String.fromCharCode(65 + i)})</strong> ${opt}</span>`;
                btn.onclick = () => {
                    showFeedbackModal(i === selectedQuestion.correct);
                };
                grid.appendChild(btn);
            });
        }

        // Modal de Feedback com VFX e Shake em caso de erro
        function showFeedbackModal(isCorrect) {
            const modal = document.getElementById('feedback-modal');
            const title = document.getElementById('modal-title');
            const desc = document.getElementById('modal-desc');
            const card = document.getElementById('modal-card');

            document.getElementById('quiz-container').classList.add('hidden');
            card.classList.remove('animate-shake');

            if (isCorrect) {
                title.innerText = "ACERTOU!";
                title.className = "text-3xl font-black mb-2 uppercase tracking-wide text-[#ccff00]";
                desc.innerText = "Excelente raciocínio anatômico.";
                card.style.borderColor = "#ccff00";

                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            } else {
                title.innerText = "INCORRETO";
                title.className = "text-3xl font-black mb-2 uppercase tracking-wide text-rose-500";
                desc.innerText = "Continue estudando as estruturas cardíacas.";
                card.style.borderColor = "#f43f5e";
                
                // Aplica efeito de tremor (shake) no erro
                void card.offsetWidth; // Força reflow para reiniciar animação
                card.classList.add('animate-shake');
            }

            modal.classList.remove('hidden');

            setTimeout(() => {
                modal.classList.add('hidden');
                card.classList.remove('animate-shake');
                currentScreen = 'parts';
                document.getElementById('categories-container').classList.remove('hidden');
            }, 3000);
        }

        // Registro de Service Worker para PWA
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js').catch(err => console.log(err));
            });
        }

        window.addEventListener('DOMContentLoaded', () => {
            init3D();
            initWebcam();
        });
    </script>
</body>
</html>