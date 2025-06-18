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
            genderError: document.getElementById('gender-error'),
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
            
            // 키보드 접근성 개선
            input.addEventListener('keydown', (e) => this.handleGenderKeydown(e));
        });
        
        // 테스트 시작 이벤트
        this.elements.genderForm.addEventListener('submit', (e) => this.onStartTest(e));
        
        // 폼 유효성 검사를 위한 실시간 이벤트
        this.elements.genderForm.addEventListener('input', () => this.onFormInput());
        
        // 결과 화면 버튼 이벤트
        this.elements.shareBtn?.addEventListener('click', () => this.shareResult());
        this.elements.restartBtn?.addEventListener('click', () => this.restartTest());
        this.elements.retryBtn?.addEventListener('click', () => this.retryTest());
    }
    
    checkSavedData() {
        try {
            // localStorage에서 이전 데이터 확인
            const savedGender = localStorage.getItem('tetoEgen_selectedGender');
            const savedAnswers = localStorage.getItem('tetoEgen_testAnswers');
            const savedProgress = localStorage.getItem('tetoEgen_testProgress');
            
            if (savedGender) {
                this.selectedGender = savedGender;
                const genderInput = document.querySelector(`input[value="${savedGender}"]`);
                if (genderInput) {
                    genderInput.checked = true;
                    this.onGenderChange();
                    console.log(`저장된 성별 선택 복원: ${savedGender}`);
                }
            }
            
            // 미완료된 테스트가 있다면 복구 옵션 제공
            if (savedAnswers && savedProgress) {
                console.log('이전 테스트 데이터가 발견되었습니다.');
                this.showIncompleteTestDialog(savedAnswers, savedProgress);
            }
        } catch (error) {
            console.warn('저장된 데이터 복원 중 오류:', error);
            this.clearSavedData();
        }
    }
    
    showIncompleteTestDialog(savedAnswers, savedProgress) {
        const progress = JSON.parse(savedProgress);
        const shouldRestore = confirm(
            `미완료된 테스트가 있습니다. (${progress.current}/${progress.total} 문항 완료)\n` +
            '계속 진행하시겠습니까?'
        );
        
        if (shouldRestore) {
            this.restoreIncompleteTest(savedAnswers, progress);
        } else {
            this.clearTestData();
        }
    }
    
    restoreIncompleteTest(savedAnswers, progress) {
        try {
            this.answers = JSON.parse(savedAnswers);
            this.currentQuestionIndex = progress.current;
            
            // 데이터 로드 후 질문 재개
            this.loadData().then(() => {
                this.selectRandomQuestions();
                this.showScreen('question');
                this.displayCurrentQuestion();
            });
        } catch (error) {
            console.error('테스트 복원 중 오류:', error);
            this.clearTestData();
            this.showError('테스트 복원에 실패했습니다. 새로 시작해주세요.');
        }
    }
    
    onGenderChange() {
        const selectedGender = document.querySelector('input[name="gender"]:checked');
        if (selectedGender) {
            this.selectedGender = selectedGender.value;
            this.elements.startBtn.disabled = false;
            
            // 성별 선택 시 에러 메시지 숨기기
            this.hideGenderError();
            
            // localStorage에 성별 저장 (네임스페이스 사용)
            try {
                localStorage.setItem('tetoEgen_selectedGender', this.selectedGender);
                
                // 타임스탬프도 함께 저장하여 유효성 관리
                const timestamp = new Date().toISOString();
                localStorage.setItem('tetoEgen_genderTimestamp', timestamp);
                
                console.log(`성별 선택 저장됨: ${this.selectedGender}`);
            } catch (error) {
                console.warn('성별 선택 저장 실패:', error);
            }
        } else {
            this.selectedGender = null;
            this.elements.startBtn.disabled = true;
        }
    }
    
    async onStartTest(e) {
        e.preventDefault();
        
        // 최종 유효성 검사
        const validation = this.performFinalValidation();
        if (!validation.isValid) {
            // 첫 번째 에러 메시지 표시
            this.showGenderError(validation.errors[0]);
            
            // 모든 에러를 콘솔에 로그
            console.warn('폼 유효성 검사 실패:', validation.errors);
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
    
    validateGenderSelection() {
        // 현재 선택된 성별 다시 확인
        const selectedGender = document.querySelector('input[name="gender"]:checked');
        
        if (!selectedGender) {
            this.showGenderError('성별을 선택해주세요.');
            
            // 첫 번째 성별 옵션에 포커스
            const firstGenderOption = document.querySelector('input[name="gender"]');
            if (firstGenderOption) {
                firstGenderOption.focus();
            }
            
            return false;
        }
        
        // 추가 유효성 검사
        if (!selectedGender.value || (selectedGender.value !== 'male' && selectedGender.value !== 'female')) {
            this.showGenderError('올바른 성별을 선택해주세요.');
            return false;
        }
        
        // 모든 검사 통과
        this.selectedGender = selectedGender.value;
        this.hideGenderError();
        return true;
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
            text: option.text,
            timestamp: new Date().toISOString()
        });
        
        // 다음 질문으로
        this.currentQuestionIndex++;
        
        // localStorage에 진행 상황 저장
        this.saveTestProgress();
        
        // 선택된 버튼에 시각적 피드백
        const selectedButton = event.target;
        selectedButton.classList.add('selected');
        
        // 약간의 지연 후 다음 질문 표시 (UX 개선)
        setTimeout(() => {
            this.displayCurrentQuestion();
        }, 600);
    }
    
    saveTestProgress() {
        try {
            // 답변 저장 (네임스페이스 사용)
            localStorage.setItem('tetoEgen_testAnswers', JSON.stringify(this.answers));
            
            // 진행 상황 저장
            const progressData = {
                current: this.currentQuestionIndex,
                total: this.selectedQuestions.length,
                timestamp: new Date().toISOString(),
                gender: this.selectedGender
            };
            localStorage.setItem('tetoEgen_testProgress', JSON.stringify(progressData));
            
            console.log(`테스트 진행 상황 저장: ${this.currentQuestionIndex}/${this.selectedQuestions.length}`);
            
        } catch (error) {
            console.warn('테스트 진행 상황 저장 실패:', error);
            // LocalStorage 용량 초과 등의 경우 이전 데이터 정리
            this.clearOldData();
        }
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
        
        // 결과 저장 (네임스페이스 사용)
        const resultData = {
            tetoPercentage,
            egenPercentage,
            result,
            timestamp: new Date().toISOString(),
            answers: this.answers,
            gender: this.selectedGender
        };
        
        try {
            localStorage.setItem('tetoEgen_lastTestResult', JSON.stringify(resultData));
            
            // 테스트 완료 후 진행 상황 데이터 정리
            this.clearTestData();
            
            console.log('테스트 결과 저장 완료');
        } catch (error) {
            console.warn('결과 저장 실패:', error);
        }
        
        console.log('결과 표시 완료:', resultData);
    }
    
    shareResult() {
        const resultData = JSON.parse(localStorage.getItem('tetoEgen_lastTestResult'));
        if (!resultData) {
            console.warn('공유할 결과 데이터가 없습니다.');
            return;
        }
        
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
        
        // localStorage에서 테스트 관련 데이터 정리 (성별 선택은 유지)
        this.clearTestData();
        
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
    
    // ===== 폼 유효성 검사 메소드들 =====
    
    showGenderError(message) {
        if (this.elements.genderError) {
            this.elements.genderError.textContent = message;
            this.elements.genderError.classList.remove('visually-hidden');
            
            // ARIA로 스크린 리더에 알림
            this.elements.genderError.setAttribute('aria-live', 'assertive');
            
            // 시각적 피드백을 위한 폼 스타일 변경
            const genderOptions = document.querySelector('.gender-options');
            if (genderOptions) {
                genderOptions.classList.add('has-error');
            }
            
            console.log('성별 선택 에러 표시:', message);
        }
    }
    
    hideGenderError() {
        if (this.elements.genderError) {
            this.elements.genderError.textContent = '';
            this.elements.genderError.classList.add('visually-hidden');
            this.elements.genderError.setAttribute('aria-live', 'polite');
            
            // 에러 스타일 제거
            const genderOptions = document.querySelector('.gender-options');
            if (genderOptions) {
                genderOptions.classList.remove('has-error');
            }
        }
    }
    
    validateForm() {
        // 전체 폼 유효성 검사 (추후 확장 가능)
        let isValid = true;
        
        // 성별 선택 검사
        if (!this.validateGenderSelection()) {
            isValid = false;
        }
        
        return isValid;
    }
    
    // ===== 이벤트 핸들러 메소드들 =====
    
    handleGenderKeydown(e) {
        // 화살표 키로 성별 선택 이동
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            const maleInput = document.getElementById('male');
            if (maleInput) {
                maleInput.checked = true;
                maleInput.focus();
                this.onGenderChange();
            }
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            const femaleInput = document.getElementById('female');
            if (femaleInput) {
                femaleInput.checked = true;
                femaleInput.focus();
                this.onGenderChange();
            }
        } else if (e.key === 'Enter' || e.key === ' ') {
            // 엔터나 스페이스로 선택
            e.preventDefault();
            e.target.checked = true;
            this.onGenderChange();
            
            // 선택 후 잠시 후 시작 버튼에 포커스 (UX 개선)
            setTimeout(() => {
                if (this.elements.startBtn && !this.elements.startBtn.disabled) {
                    this.elements.startBtn.focus();
                }
            }, 500);
        }
    }
    
    onFormInput() {
        // 실시간 폼 유효성 검사
        const selectedGender = document.querySelector('input[name="gender"]:checked');
        
        if (selectedGender) {
            // 성별이 선택되면 에러 메시지 숨기기
            this.hideGenderError();
            
            // 성공 애니메이션 표시 (선택적)
            const genderOptions = document.querySelector('.gender-options');
            if (genderOptions) {
                genderOptions.classList.remove('has-error');
                genderOptions.classList.add('success');
                
                // 잠시 후 성공 클래스 제거
                setTimeout(() => {
                    genderOptions.classList.remove('success');
                }, 600);
            }
        }
    }
    
    // 추가 유효성 검사: 폼 제출 전 최종 검증
    performFinalValidation() {
        const errors = [];
        
        // 성별 선택 검사
        const selectedGender = document.querySelector('input[name="gender"]:checked');
        if (!selectedGender) {
            errors.push('성별을 선택해주세요.');
        } else if (!['male', 'female'].includes(selectedGender.value)) {
            errors.push('올바른 성별을 선택해주세요.');
        }
        
        // 브라우저 호환성 검사
        if (!window.localStorage) {
            errors.push('브라우저가 localStorage를 지원하지 않습니다.');
        }
        
        // 네트워크 연결 상태 검사 (가능한 경우)
        if (navigator.onLine === false) {
            errors.push('네트워크 연결을 확인해주세요.');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    // ===== LocalStorage 관리 메소드들 =====
    
    clearTestData() {
        // 테스트 진행 상황과 결과만 정리 (성별 선택은 유지)
        try {
            localStorage.removeItem('tetoEgen_testAnswers');
            localStorage.removeItem('tetoEgen_testProgress');
            console.log('테스트 데이터 정리 완료');
        } catch (error) {
            console.warn('테스트 데이터 정리 실패:', error);
        }
    }
    
    clearSavedData() {
        // 모든 앱 관련 데이터 정리
        try {
            const keysToRemove = [
                'tetoEgen_selectedGender',
                'tetoEgen_genderTimestamp',
                'tetoEgen_testAnswers',
                'tetoEgen_testProgress',
                'tetoEgen_lastTestResult'
            ];
            
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
            });
            
            console.log('모든 저장된 데이터 정리 완료');
        } catch (error) {
            console.warn('데이터 정리 실패:', error);
        }
    }
    
    clearOldData() {
        // 용량 부족 등의 경우 오래된 데이터 정리
        try {
            const now = new Date().getTime();
            const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000); // 7일
            
            // 오래된 결과 데이터 확인 및 정리
            const lastResult = localStorage.getItem('tetoEgen_lastTestResult');
            if (lastResult) {
                const resultData = JSON.parse(lastResult);
                const resultTime = new Date(resultData.timestamp).getTime();
                
                if (resultTime < sevenDaysAgo) {
                    localStorage.removeItem('tetoEgen_lastTestResult');
                    console.log('오래된 결과 데이터 정리됨');
                }
            }
            
            // 성별 선택 타임스탬프 확인
            const genderTimestamp = localStorage.getItem('tetoEgen_genderTimestamp');
            if (genderTimestamp) {
                const genderTime = new Date(genderTimestamp).getTime();
                const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000); // 30일
                
                if (genderTime < thirtyDaysAgo) {
                    localStorage.removeItem('tetoEgen_selectedGender');
                    localStorage.removeItem('tetoEgen_genderTimestamp');
                    console.log('오래된 성별 선택 데이터 정리됨');
                }
            }
            
        } catch (error) {
            console.warn('오래된 데이터 정리 실패:', error);
            // 최후의 수단으로 모든 데이터 정리
            this.clearSavedData();
        }
    }
    
    getStorageInfo() {
        // LocalStorage 사용량 정보 (디버깅 용도)
        try {
            const keys = ['tetoEgen_selectedGender', 'tetoEgen_testAnswers', 'tetoEgen_testProgress', 'tetoEgen_lastTestResult'];
            const info = {};
            
            keys.forEach(key => {
                const value = localStorage.getItem(key);
                info[key] = {
                    exists: !!value,
                    size: value ? value.length : 0
                };
            });
            
            console.log('LocalStorage 사용 현황:', info);
            return info;
        } catch (error) {
            console.warn('Storage 정보 조회 실패:', error);
            return {};
        }
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