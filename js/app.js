// 테토/에겐 성격 유형 테스트 앱
class TetoEgenApp {
    constructor() {
        this.currentQuestionIndex = 0;
        this.answers = [];
        this.questions = [];
        this.results = [];
        this.selectedGender = null;
        
        this.init();
    }
    
    init() {
        console.log('테토/에겐 테스트 앱 초기화 중...');
        
        // DOM 요소 선택
        this.screens = {
            welcome: document.getElementById('welcome-screen'),
            loading: document.getElementById('loading-screen'),
            question: document.getElementById('question-screen'),
            result: document.getElementById('result-screen'),
            error: document.getElementById('error-screen')
        };
        
        this.elements = {
            genderForm: document.getElementById('gender-form'),
            startBtn: document.querySelector('.start-btn'),
            progressFill: document.querySelector('.progress-fill'),
            progressText: document.querySelector('.progress-text'),
            questionText: document.getElementById('question-text'),
            questionOptions: document.getElementById('question-options'),
            tetoPercentage: document.getElementById('teto-percentage'),
            egenPercentage: document.getElementById('egen-percentage'),
            resultTitle: document.getElementById('result-title'),
            resultDescription: document.getElementById('result-description'),
            resultAdvice: document.getElementById('result-advice'),
            shareBtn: document.getElementById('share-btn'),
            restartBtn: document.getElementById('restart-btn'),
            retryBtn: document.getElementById('retry-btn'),
            errorMessage: document.getElementById('error-message')
        };
        
        // 이벤트 리스너 등록
        this.bindEvents();
        
        // 저장된 데이터 확인
        this.checkSavedData();
    }
    
    bindEvents() {
        // 성별 선택 이벤트
        const genderInputs = document.querySelectorAll('input[name="gender"]');
        genderInputs.forEach(input => {
            input.addEventListener('change', () => this.onGenderChange());
        });
        
        // 테스트 시작 이벤트
        this.elements.genderForm.addEventListener('submit', (e) => this.onStartTest(e));
        
        // 결과 화면 버튼 이벤트
        this.elements.shareBtn?.addEventListener('click', () => this.shareResult());
        this.elements.restartBtn?.addEventListener('click', () => this.restartTest());
        this.elements.retryBtn?.addEventListener('click', () => this.retryTest());
    }
    
    checkSavedData() {
        // localStorage에서 이전 데이터 확인
        const savedGender = localStorage.getItem('selectedGender');
        const savedAnswers = localStorage.getItem('testAnswers');
        
        if (savedGender) {
            this.selectedGender = savedGender;
            const genderInput = document.querySelector(`input[value="${savedGender}"]`);
            if (genderInput) {
                genderInput.checked = true;
                this.onGenderChange();
            }
        }
        
        // 미완료된 테스트가 있다면 복구 옵션 제공 (추후 구현)
        if (savedAnswers) {
            console.log('이전 테스트 데이터가 발견되었습니다.');
        }
    }
    
    onGenderChange() {
        const selectedGender = document.querySelector('input[name="gender"]:checked');
        if (selectedGender) {
            this.selectedGender = selectedGender.value;
            this.elements.startBtn.disabled = false;
            
            // localStorage에 성별 저장
            localStorage.setItem('selectedGender', this.selectedGender);
        } else {
            this.elements.startBtn.disabled = true;
        }
    }
    
    async onStartTest(e) {
        e.preventDefault();
        
        if (!this.selectedGender) {
            this.showError('성별을 선택해주세요.');
            return;
        }
        
        try {
            this.showLoading();
            await this.loadData();
            this.startQuestions();
        } catch (error) {
            console.error('테스트 시작 중 오류:', error);
            this.showError('테스트를 시작할 수 없습니다. 잠시 후 다시 시도해주세요.');
        }
    }
    
    async loadData() {
        try {
            // 질문 데이터 로드
            const questionsResponse = await fetch('data/questions.json');
            if (!questionsResponse.ok) {
                throw new Error('질문 데이터를 불러올 수 없습니다.');
            }
            const questionsData = await questionsResponse.json();
            
            // 결과 데이터 로드
            const resultsResponse = await fetch('data/results.json');
            if (!resultsResponse.ok) {
                throw new Error('결과 데이터를 불러올 수 없습니다.');
            }
            const resultsData = await resultsResponse.json();
            
            this.questions = questionsData;
            this.results = resultsData;
            
            console.log('데이터 로딩 완료:', {
                questions: this.questions.length,
                results: this.results.length
            });
            
        } catch (error) {
            console.error('데이터 로딩 오류:', error);
            throw error;
        }
    }
    
    startQuestions() {
        // 성별에 맞는 질문 10개 랜덤 선택
        this.selectRandomQuestions();
        
        // 답변 배열 초기화
        this.answers = [];
        this.currentQuestionIndex = 0;
        
        // 질문 화면으로 전환
        this.showScreen('question');
        this.displayCurrentQuestion();
    }
    
    selectRandomQuestions() {
        // 전체 질문에서 10개 랜덤 선택 (테토/에겐 균형 고려)
        const availableQuestions = this.questions.filter(q => 
            q[this.selectedGender] && q[this.selectedGender].options
        );
        
        // 간단한 랜덤 선택 (향후 균형 알고리즘으로 개선)
        const shuffled = availableQuestions.sort(() => 0.5 - Math.random());
        this.selectedQuestions = shuffled.slice(0, 10);
        
        console.log('선택된 질문:', this.selectedQuestions.length + '개');
    }
    
    displayCurrentQuestion() {
        if (this.currentQuestionIndex >= this.selectedQuestions.length) {
            this.calculateResults();
            return;
        }
        
        const question = this.selectedQuestions[this.currentQuestionIndex];
        const genderData = question[this.selectedGender];
        
        // 진행률 업데이트
        const progress = ((this.currentQuestionIndex + 1) / this.selectedQuestions.length) * 100;
        this.elements.progressFill.style.width = `${progress}%`;
        this.elements.progressText.textContent = `${this.currentQuestionIndex + 1} / ${this.selectedQuestions.length}`;
        
        // 질문 텍스트 표시
        this.elements.questionText.textContent = genderData.text;
        
        // 선택지 생성
        this.elements.questionOptions.innerHTML = '';
        genderData.options.forEach((option, index) => {
            const button = document.createElement('button');
            button.className = 'option-btn';
            button.textContent = option.text;
            button.addEventListener('click', () => this.selectAnswer(option, index));
            
            this.elements.questionOptions.appendChild(button);
        });
    }
    
    selectAnswer(option, optionIndex) {
        // 답변 저장
        this.answers.push({
            questionId: this.selectedQuestions[this.currentQuestionIndex].id,
            questionIndex: this.currentQuestionIndex,
            optionIndex: optionIndex,
            tag: option.tag,
            text: option.text
        });
        
        // localStorage에 답변 저장
        localStorage.setItem('testAnswers', JSON.stringify(this.answers));
        
        // 다음 질문으로
        this.currentQuestionIndex++;
        
        // 약간의 지연 후 다음 질문 표시 (UX 개선)
        setTimeout(() => {
            this.displayCurrentQuestion();
        }, 300);
    }
    
    calculateResults() {
        console.log('결과 계산 중...', this.answers);
        
        // 테토/에겐 태그 카운트
        let tetoCount = 0;
        let egenCount = 0;
        
        this.answers.forEach(answer => {
            if (answer.tag === '테토') {
                tetoCount++;
            } else if (answer.tag === '에겐') {
                egenCount++;
            }
        });
        
        const totalAnswers = this.answers.length;
        const tetoPercentage = Math.round((tetoCount / totalAnswers) * 100);
        const egenPercentage = Math.round((egenCount / totalAnswers) * 100);
        
        console.log('계산 결과:', { tetoCount, egenCount, tetoPercentage, egenPercentage });
        
        // 결과 매칭
        const result = this.findMatchingResult(tetoPercentage);
        
        this.displayResults(tetoPercentage, egenPercentage, result);
    }
    
    findMatchingResult(tetoPercentage) {
        // 결과 범위에 맞는 결과 찾기
        const matchingResult = this.results.find(result => {
            const [min, max] = result.range;
            return tetoPercentage >= min && tetoPercentage <= max;
        });
        
        return matchingResult || this.results[0]; // 기본값 반환
    }
    
    displayResults(tetoPercentage, egenPercentage, result) {
        // 결과 화면으로 전환
        this.showScreen('result');
        
        // 퍼센트 표시
        this.elements.tetoPercentage.textContent = `${tetoPercentage}%`;
        this.elements.egenPercentage.textContent = `${egenPercentage}%`;
        
        // 프로그레스 바 애니메이션
        setTimeout(() => {
            document.querySelector('.teto-fill').style.width = `${tetoPercentage}%`;
            document.querySelector('.egen-fill').style.width = `${egenPercentage}%`;
        }, 500);
        
        // 결과 내용 표시
        this.elements.resultTitle.textContent = result.title;
        this.elements.resultDescription.textContent = result.description;
        this.elements.resultAdvice.textContent = result.advice;
        
        // 테마 색상 적용
        const dominantType = tetoPercentage > egenPercentage ? 'teto' : 'egen';
        document.body.className = `result-${dominantType}`;
        
        // 결과 저장
        const resultData = {
            tetoPercentage,
            egenPercentage,
            result,
            timestamp: new Date().toISOString(),
            answers: this.answers
        };
        localStorage.setItem('lastTestResult', JSON.stringify(resultData));
        
        console.log('결과 표시 완료:', resultData);
    }
    
    shareResult() {
        const resultData = JSON.parse(localStorage.getItem('lastTestResult'));
        if (!resultData) return;
        
        const shareText = `테토/에겐 성격 유형 테스트 결과
테토: ${resultData.tetoPercentage}% | 에겐: ${resultData.egenPercentage}%
${resultData.result.title}

나도 테스트해보기: ${window.location.href}`;
        
        if (navigator.share) {
            // Web Share API 지원 시
            navigator.share({
                title: '테토/에겐 성격 유형 테스트 결과',
                text: shareText,
                url: window.location.href
            }).catch(error => {
                console.error('공유 실패:', error);
                this.fallbackShare(shareText);
            });
        } else {
            this.fallbackShare(shareText);
        }
    }
    
    fallbackShare(text) {
        // 클립보드에 복사
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                alert('결과가 클립보드에 복사되었습니다!');
            }).catch(() => {
                this.showShareDialog(text);
            });
        } else {
            this.showShareDialog(text);
        }
    }
    
    showShareDialog(text) {
        // 간단한 공유 다이얼로그 (추후 개선)
        const result = prompt('아래 텍스트를 복사해서 공유하세요:', text);
    }
    
    restartTest() {
        // 데이터 초기화
        this.currentQuestionIndex = 0;
        this.answers = [];
        this.selectedQuestions = [];
        
        // localStorage 정리
        localStorage.removeItem('testAnswers');
        localStorage.removeItem('lastTestResult');
        
        // 클래스 제거
        document.body.className = '';
        
        // 시작 화면으로
        this.showScreen('welcome');
        
        console.log('테스트 재시작');
    }
    
    retryTest() {
        // 에러 화면에서 재시도
        this.showScreen('welcome');
    }
    
    showScreen(screenName) {
        // 모든 화면 숨기기
        Object.values(this.screens).forEach(screen => {
            if (screen) screen.classList.add('hidden');
        });
        
        // 선택된 화면 표시
        if (this.screens[screenName]) {
            this.screens[screenName].classList.remove('hidden');
        }
    }
    
    showLoading() {
        this.showScreen('loading');
    }
    
    showError(message) {
        this.elements.errorMessage.textContent = message;
        this.showScreen('error');
    }
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.tetoEgenApp = new TetoEgenApp();
        console.log('테토/에겐 테스트 앱이 시작되었습니다.');
    } catch (error) {
        console.error('앱 초기화 실패:', error);
        document.body.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #FF4757;">
                <h2>앱을 시작할 수 없습니다</h2>
                <p>페이지를 새로고침해주세요.</p>
            </div>
        `;
    }
});

// 서비스 워커 등록 (추후 구현)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // navigator.serviceWorker.register('/sw.js')
        //     .then(registration => console.log('SW registered'))
        //     .catch(error => console.log('SW registration failed'));
    });
} 