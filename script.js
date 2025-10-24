import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, query, doc, setDoc, deleteDoc, setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let db, auth, userId = '', currentRecordId = null, tongueImageDataUrl = null;

const loadingOverlay = document.getElementById('loading-overlay');
const userInfo = document.getElementById('user-info');
const fichasList = document.getElementById('fichas-list');
const fichaForm = document.getElementById('ficha-form');
const messageBox = document.getElementById('message-box');
const noFichasMessage = document.getElementById('no-fichas');
const newFichaBtn = document.getElementById('new-ficha-btn');
const deleteFichaBtn = document.getElementById('delete-ficha-btn');
const exportFichaBtn = document.getElementById('export-ficha-btn');
const importFileInput = document.getElementById('import-file-input');
const importFichaBtn = document.getElementById('import-ficha-btn');
const recordCountSpan = document.getElementById('record-count');
const currentRecordNameSpan = document.getElementById('current-record-name');
const saveButton = document.getElementById('save-button');
const painValueSpan = document.getElementById('painValue');
const painLevelInput = document.getElementById('painLevel');
const uploadTongueImageBtn = document.getElementById('upload-tongue-image-btn');
const tongueImageInput = document.getElementById('tongue-image-input');
const tongueImagePreview = document.getElementById('tongue-image-preview');
const tongueImagePlaceholder = document.getElementById('tongue-image-placeholder');
const sessionRowsContainer = document.getElementById('session-rows');
const uploadPatientPhotoBtn = document.getElementById('upload-patient-photo-btn');
const patientPhotoInput = document.getElementById('patient-photo-input');
const patientPhotoPreview = document.getElementById('patient-photo-preview');
const patientPhotoPlaceholder = document.getElementById('patient-photo-placeholder');

let patientPhotoDataUrl = null;


function showMessage(text, isError = false) {
    messageBox.textContent = text;
    messageBox.className = 'p-2 rounded-lg text-sm'; // Reset classes
    if (isError) {
        messageBox.classList.add('bg-red-100', 'text-red-700');
    } else {
        messageBox.classList.add('bg-green-100', 'text-green-700');
    }
    setTimeout(() => { messageBox.classList.add('hidden'); }, 5000);
}

const getCheckedValues = (name) => Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(c => c.value);
const setCheckedValue = (name, value) => { document.querySelectorAll(`input[name="${name}"]`).forEach(el => el.checked = el.value === value); };
const setCheckboxGroup = (name, values) => {
    const valuesArray = Array.isArray(values) ? values : (typeof values === 'string' ? values.split(',') : []);
    document.querySelectorAll(`input[name="${name}"]`).forEach(el => el.checked = valuesArray.includes(el.value));
};

function getFormData() {
    const personal = {
        nombre: document.getElementById('nombre').value.trim(),
        occupation: document.getElementById('occupation').value.trim(),
        dob: document.getElementById('dob').value,
        age: document.getElementById('age').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        motivo: document.getElementById('motivo').value.trim(),
        background: document.getElementById('background').value.trim(),
        meds: document.getElementById('meds').value.trim(),
        familyHistory: document.getElementById('familyHistory').value.trim(),
        other: document.getElementById('other').value.trim(),
        sport: document.getElementById('sport').value.trim(),
        smokes: document.querySelector('input[name="smokes"]:checked')?.value || '',
        alcohol: document.querySelector('input[name="alcohol"]:checked')?.value || '',
        consentAgreed: document.getElementById('consentAgreed').checked,
        patientPhoto: patientPhotoDataUrl,
    };

    const mtc = {
        // Lengua
        tongueColor: document.getElementById('tongueColor').value,
        tongueShape: getCheckedValues('tongueShape'),
        tongueShine: document.querySelector('input[name="tongueShine"]:checked')?.value || '',
        tongueTexture: document.querySelector('input[name="tongueTexture"]:checked')?.value || '',
        tongueMoisture: document.querySelector('input[name="tongueMoisture"]:checked')?.value || '',
        tongueMovement: getCheckedValues('tongueMovement'),
        coatingColor: document.getElementById('coatingColor').value,
        coatingThickness: document.getElementById('coatingThickness').value,
        coatingNature: getCheckedValues('coatingNature'),
        obsPunta: document.getElementById('obsPunta').value.trim(),
        obsBordes: document.getElementById('obsBordes').value.trim(),
        obsLaterales: document.getElementById('obsLaterales').value.trim(),
        obsRaiz: document.getElementById('obsRaiz').value.trim(),
        obsGeneral: document.getElementById('obsGeneral').value.trim(),
        tongueImage: tongueImageDataUrl,
        // Pulso
        pulseVelocity: document.querySelector('select[name="pulseVelocity"]').value,
        pulseRhythm: document.querySelector('select[name="pulseRhythm"]').value,
        pulseDepth: document.querySelector('select[name="pulseDepth"]').value,
        pulseForce: document.querySelector('select[name="pulseForce"]').value,
        pulseType: getCheckedValues('pulseType'),
        pulseTreasure: getCheckedValues('pulseTreasure'),
        pulsePositions: {
            rightCun: document.querySelector('input[name="rightCun"]').value.trim(),
            rightGuan: document.querySelector('input[name="rightGuan"]').value.trim(),
            rightChi: document.querySelector('input[name="rightChi"]').value.trim(),
            leftCun: document.querySelector('input[name="leftCun"]').value.trim(),
            leftGuan: document.querySelector('input[name="leftGuan"]').value.trim(),
            leftChi: document.querySelector('input[name="leftChi"]').value.trim(),
        }
    };

    const general = {
        temp: document.querySelector('input[name="temp"]:checked')?.value || '',
        sweat_suda: getCheckedValues('sweat_suda'),
        sweat_when: getCheckedValues('sweat_when'),
        sweat_activity: getCheckedValues('sweat_activity'),
        sweat_location: getCheckedValues('sweat_location'),
        sweat_frequency: document.querySelector('input[name="sweat_frequency"]').value.trim(),
        appetite_level: getCheckedValues('appetite_level'),
        appetite_type: getCheckedValues('appetite_type'),
        appetite_discomfort: getCheckedValues('appetite_discomfort'),
        appetite_flavor: getCheckedValues('appetite_flavor'),
        thirst_level: getCheckedValues('thirst_level'),
        thirst_type: getCheckedValues('thirst_type'),
        thirst_temp: getCheckedValues('thirst_temp'),
        stool_consistency: getCheckedValues('stool_consistency'),
        stool_observation: getCheckedValues('stool_observation'),
        stool_color: document.querySelector('input[name="stool_color"]').value.trim(),
        urine_freq: getCheckedValues('urine_freq'),
        urine_control: getCheckedValues('urine_control'),
        urine_sensation: getCheckedValues('urine_sensation'),
        urine_stream: getCheckedValues('urine_stream'),
        urine_color: document.querySelector('input[name="urine_color"]').value.trim(),
        menses_cycle: getCheckedValues('menses_cycle'),
        menses_amount: getCheckedValues('menses_amount'),
        menses_texture: getCheckedValues('menses_texture'),
        menses_other: getCheckedValues('menses_other'),
        menses_details: document.querySelector('input[name="menses_details"]').value.trim(),
        emotion_type: getCheckedValues('emotion_type'),
        sleep_quality: getCheckedValues('sleep_quality'),
        sleep_hours: document.querySelector('input[name="sleep_hours"]').value.trim(),
        ear_symptom: getCheckedValues('ear_symptom'),
        eye_symptom: getCheckedValues('eye_symptom'),
        energy_level: getCheckedValues('energy_level'),
        energy_food: document.querySelector('input[name="energy_food"]:checked')?.value || '',
        energy_rest: document.querySelector('input[name="energy_rest"]:checked')?.value || '',
        painLevel: document.getElementById('painLevel').value,
        painDescription: document.getElementById('painDescription').value.trim()
    };

    const seguimiento = [];
    for (let i = 1; i <= 10; i++) {
        const sessionData = {
            date: document.getElementById(`session_${i}_date`).value,
            symptoms: document.getElementById(`session_${i}_symptoms`).value,
            status: document.getElementById(`session_${i}_status`).value,
            treatment: document.getElementById(`session_${i}_treatment`).value,
        };
        seguimiento.push(sessionData);
    }

    return { personal, mtc, general, seguimiento };
}

function fillForm(data) {
    if (!data.personal || !data.mtc || !data.general) {
         showMessage("Error: El archivo importado no tiene la estructura de ficha clínica esperada.", true);
         return;
    }
    const setInputValue = (id, value) => { const el = document.getElementById(id); if (el) el.value = value || ''; };
    const setInputByName = (name, value) => { const el = document.querySelector(`[name="${name}"]`); if (el) el.value = value || ''; };
    fichaForm.reset();
    currentRecordId = data.id;
    document.getElementById('recordId').value = data.id || '';

    const p = data.personal || {};
    Object.keys(p).forEach(key => {
         if (key === 'patientPhoto') {
             if (p.patientPhoto) {
                patientPhotoDataUrl = p.patientPhoto;
                patientPhotoPreview.src = patientPhotoDataUrl;
                patientPhotoPreview.classList.remove('hidden');
                patientPhotoPlaceholder.classList.add('hidden');
            } else {
                patientPhotoDataUrl = null;
                patientPhotoPreview.src = '';
                patientPhotoPreview.classList.add('hidden');
                patientPhotoPlaceholder.classList.remove('hidden');
            }
        } else {
            const el = document.getElementById(key);
            if (el) {
                if (el.type === 'checkbox') el.checked = p[key];
                else el.value = p[key] || '';
            } else {
                setCheckedValue(key, p[key]);
            }
        }
    });

    const m = data.mtc || {};
    Object.keys(m).forEach(key => {
        if (key === 'pulsePositions') {
            if (m.pulsePositions) {
                Object.keys(m.pulsePositions).forEach(posKey => setInputByName(posKey, m.pulsePositions[posKey]));
            }
        } else if (key === 'tongueImage') {
             if (m.tongueImage) {
                tongueImageDataUrl = m.tongueImage;
                tongueImagePreview.src = tongueImageDataUrl;
                tongueImagePreview.classList.remove('hidden');
                tongueImagePlaceholder.classList.add('hidden');
            } else {
                tongueImageDataUrl = null;
                tongueImagePreview.src = '';
                tongueImagePreview.classList.add('hidden');
                tongueImagePlaceholder.classList.remove('hidden');
            }
        } else if (Array.isArray(m[key])) {
            setCheckboxGroup(key, m[key]);
        } else if (document.querySelector(`input[name="${key}"]`)?.type === 'radio') {
            setCheckedValue(key, m[key]);
        } else {
            const el = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
            if(el) el.value = m[key] || '';
        }
    });

    const g = data.general || {};
     Object.keys(g).forEach(key => {
        if (Array.isArray(g[key])) {
            setCheckboxGroup(key, g[key]);
        } else if (document.querySelector(`input[name="${key}"]`)) {
            const el = document.querySelector(`input[name="${key}"]`);
             if(el.type === 'radio') setCheckedValue(key, g[key]);
             else if (el.type === 'range') {el.value = g[key] || 5; painValueSpan.textContent = el.value;}
             else el.value = g[key] || '';
        } else {
            setInputValue(key, g[key]);
        }
    });

    if (data.seguimiento && Array.isArray(data.seguimiento)) {
        data.seguimiento.forEach((session, index) => {
            const i = index + 1;
            if (i > 10) return;
            setInputValue(`session_${i}_date`, session.date);
            setInputValue(`session_${i}_symptoms`, session.symptoms);
            setInputValue(`session_${i}_status`, session.status);
            setInputValue(`session_${i}_treatment`, session.treatment);
        });
    }

    currentRecordNameSpan.textContent = data.personal.nombre || 'Ficha Cargada';
    deleteFichaBtn.classList.remove('hidden');
    deleteFichaBtn.disabled = false;
    document.querySelector('.tab-button[data-tab="tab1"]').click();
    showMessage(`Datos de "${data.personal.nombre}" cargados.`);
}

function clearForm() {
    fichaForm.reset();
    currentRecordId = null;
    document.getElementById('recordId').value = '';
    currentRecordNameSpan.textContent = 'Nueva Ficha';
    painLevelInput.value = 5;
    painValueSpan.textContent = '5';
    deleteFichaBtn.classList.add('hidden');
    deleteFichaBtn.disabled = true;
    tongueImageDataUrl = null;
    tongueImagePreview.src = '';
    tongueImagePreview.classList.add('hidden');
    tongueImagePlaceholder.classList.remove('hidden');
    tongueImageInput.value = '';
    patientPhotoDataUrl = null;
    patientPhotoPreview.src = '';
    patientPhotoPreview.classList.add('hidden');
    patientPhotoPlaceholder.classList.remove('hidden');
    patientPhotoInput.value = '';

    for (let i = 1; i <= 10; i++) {
        document.getElementById(`session_${i}_date`).value = '';
        document.getElementById(`session_${i}_symptoms`).value = '';
        document.getElementById(`session_${i}_status`).value = '';
        document.getElementById(`session_${i}_treatment`).value = '';
    }
    document.querySelector('.tab-button[data-tab="tab1"]').click();
    showMessage("Formulario listo para una nueva ficha.");
}

async function initializeFirebase() {
    try {
        if (Object.keys(firebaseConfig).length === 0) throw new Error("Configuración de Firebase no encontrada.");
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        if (initialAuthToken) await signInWithCustomToken(auth, initialAuthToken);
        else await signInAnonymously(auth);
        userId = auth.currentUser?.uid || crypto.randomUUID();
        userInfo.textContent = `ID de Usuario: ${userId}`;
        loadingOverlay.style.display = 'none';
        startDataListener();
    } catch (error) {
        console.error("Error en Firebase:", error);
        showMessage(`Error al iniciar: ${error.message}`, true);
        loadingOverlay.style.display = 'none';
    }
}

function startDataListener() {
    const path = `/artifacts/${appId}/users/${userId}/fichas_clinicas_full`;
    onSnapshot(query(collection(db, path)), (snapshot) => {
        const fichas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderFichas(fichas.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    }, error => {
        console.error("Error al escuchar fichas:", error);
        showMessage(`Error al cargar fichas: ${error.message}`, true);
    });
}

function renderFichas(fichas) {
    fichasList.innerHTML = '';
    recordCountSpan.textContent = fichas.length;
    noFichasMessage.classList.toggle('hidden', fichas.length > 0);
    if(fichas.length === 0) noFichasMessage.textContent = 'No hay fichas guardadas.';

    fichas.forEach(ficha => {
        const li = document.createElement('li');
        li.className = 'cursor-pointer p-2 rounded-lg hover:bg-blue-100 transition duration-100 text-sm bg-gray-50 border shadow-sm';
        li.dataset.id = ficha.id;
        li.innerHTML = `<p class="font-semibold text-blue-800">${ficha.personal?.nombre || 'Paciente sin nombre'}</p>`;
        li.addEventListener('click', () => fillForm(ficha));
        fichasList.appendChild(li);
    });
}

fichaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = getFormData();
    const id = document.getElementById('recordId').value || crypto.randomUUID();
    if (!data.personal.nombre || !data.personal.motivo) {
        return showMessage("Nombre y Motivo de Consulta son obligatorios.", true);
    }
    saveButton.textContent = 'Guardando...';
    saveButton.disabled = true;
    try {
        const path = `/artifacts/${appId}/users/${userId}/fichas_clinicas_full`;
        const docRef = doc(db, path, id);
        const isNew = !currentRecordId;
        const saveData = { ...data, lastUpdated: Date.now(), createdBy: userId };
        if (isNew) saveData.createdAt = Date.now();
        await setDoc(docRef, saveData, { merge: true });
        currentRecordId = id;
        document.getElementById('recordId').value = id;
        currentRecordNameSpan.textContent = data.personal.nombre;
        deleteFichaBtn.disabled = false;
        deleteFichaBtn.classList.remove('hidden');
        showMessage(`Ficha de ${data.personal.nombre} guardada.`);
    } catch (error) {
        console.error("Error al guardar:", error);
        showMessage(`Error al guardar: ${error.message}`, true);
    } finally {
        saveButton.textContent = '💾 Guardar Ficha';
        saveButton.disabled = false;
    }
});

function flattenObject(obj, parent = '', res = {}) {
    for(let key in obj){
        const propName = parent ? `${parent}.${key}` : key;
        const value = obj[key];

        if(typeof value === 'object' && value !== null){
            if(Array.isArray(value) && key === 'seguimiento') { // Special handling for seguimiento
                value.forEach((session, index) => {
                    Object.keys(session).forEach(sessionKey => {
                        res[`${propName}.${index}.${sessionKey}`] = session[sessionKey];
                    });
                });
            } else if (Array.isArray(value)) {
                 res[propName] = value.join(',');
            } else {
                flattenObject(value, propName, res);
            }
        } else {
            res[propName] = value;
        }
    }
    return res;
}

function unflattenObject(data) {
    const result = {};
    for (const path in data) {
        const keys = path.split('.');
        let current = result;
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            const nextKey = keys[i + 1];
            if (!current[key]) {
                if (isFinite(nextKey)) {
                    current[key] = [];
                } else {
                    current[key] = {};
                }
            }
            current = current[key];
        }
        const finalValue = (typeof data[path] === 'string' && data[path].includes(',')) ? data[path].split(',') : data[path];
        current[keys[keys.length - 1]] = finalValue;
    }
    return result;
}

exportFichaBtn.addEventListener('click', () => {
    const data = getFormData();
    if (!data.personal.nombre) return showMessage("El nombre del paciente es requerido para exportar.", true);

    const exportData = JSON.parse(JSON.stringify(data));
    if (exportData.mtc && exportData.mtc.tongueImage) {
        delete exportData.mtc.tongueImage;
    }
    if (exportData.personal && exportData.personal.patientPhoto) {
        delete exportData.personal.patientPhoto;
    }

    try {
        const flattenedData = flattenObject(exportData);
        const worksheet = XLSX.utils.json_to_sheet([flattenedData]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Ficha");
        XLSX.writeFile(workbook, `Ficha de ${data.personal.nombre.trim()}.xlsx`);
        showMessage(`Ficha exportada con éxito.`);
    } catch (error) {
        console.error("Error al exportar:", error);
        showMessage("Error al exportar la ficha.", true);
    }
});

importFichaBtn.addEventListener('click', () => importFileInput.click());
importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const workbook = XLSX.read(new Uint8Array(event.target.result), {type: 'array'});
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(worksheet);
            if (json.length === 0) throw new Error("El archivo Excel está vacío.");
            const unflattenedData = unflattenObject(json[0]);
            fillForm({ ...unflattenedData, id: null });
            showMessage(`Archivo "${file.name}" importado. Guarde para confirmar.`);
        } catch (error) {
            console.error("Error al importar:", error);
            showMessage(`Error al importar: ${error.message}`, true);
        }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
});

document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        document.getElementById(button.dataset.tab).classList.remove('hidden');
        button.classList.add('active');
    });
});

newFichaBtn.addEventListener('click', clearForm);
painLevelInput.addEventListener('input', (e) => { painValueSpan.textContent = e.target.value; });

uploadTongueImageBtn.addEventListener('click', () => {
    tongueImageInput.click();
});

tongueImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        tongueImageDataUrl = event.target.result;
        tongueImagePreview.src = tongueImageDataUrl;
        tongueImagePreview.classList.remove('hidden');
        tongueImagePlaceholder.classList.add('hidden');
    };
    reader.readAsDataURL(file);
});

uploadPatientPhotoBtn.addEventListener('click', () => {
    patientPhotoInput.click();
});

patientPhotoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        patientPhotoDataUrl = event.target.result;
        patientPhotoPreview.src = patientPhotoDataUrl;
        patientPhotoPreview.classList.remove('hidden');
        patientPhotoPlaceholder.classList.add('hidden');
    };
    reader.readAsDataURL(file);
});


function createSessionRows(){
    for (let i = 1; i <= 10; i++) {
        const row = document.createElement('div');
        row.className = 'grid grid-cols-12 gap-2 items-center';
        row.innerHTML = `
            <div class="col-span-1 text-center font-semibold text-gray-700">${i}</div>
            <div class="col-span-2"><input type="date" id="session_${i}_date" class="w-full p-1 border rounded-md text-xs"></div>
            <div class="col-span-5"><textarea id="session_${i}_symptoms" rows="2" class="w-full p-1 border rounded-md text-xs"></textarea></div>
            <div class="col-span-2">
                <select id="session_${i}_status" class="w-full p-1 border rounded-md text-xs">
                    <option value="">--</option>
                    <option value="mejora">⬆️ Mejora</option>
                    <option value="empeora">⬇️ Empeora</option>
                    <option value="igual">➡️ Sigue Igual</option>
                </select>
            </div>
            <div class="col-span-2"><textarea id="session_${i}_treatment" rows="2" class="w-full p-1 border rounded-md text-xs"></textarea></div>
        `;
        sessionRowsContainer.appendChild(row);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    createSessionRows();
    initializeFirebase();
});