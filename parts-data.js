/*
  설정 파일

  [파츠 이미지 올리는 법]
  깃허브 저장소의 아래 폴더에 이미지를 올리면 해당 항목에서만 자동으로 보입니다.
    images/parts/face        얼굴
    images/parts/voice       보이스
    images/parts/skin        피부
    images/parts/bangs       앞머리
    images/parts/backhair    뒷머리
    images/parts/haircolor   헤어 컬러
    images/parts/eyecolor    아이 컬러
    images/parts/meshtype    메시 타입
    images/parts/meshcolor   메시 컬러
    images/parts/hairdeco    헤어 데코
    images/parts/makeup      메이크업
    images/parts/onepoint    원 포인트
    images/parts/jewel       부탁해 주얼

  [파일 이름 규칙]
    ひたむき.png            -> 이름: ひたむき
    ひたむき__설명.png      -> 이름: ひたむき, 설명: 설명
  (이름과 설명 사이는 밑줄 두 개입니다. 파일 이름이 곧 구분 기준이므로, 한 번 정하면 바꾸지 않는 것을 권장합니다.)
*/

/* 저장소 정보: 깃허브 페이지 주소에서 자동으로 읽습니다.
   주소가 다르거나 직접 지정하고 싶을 때만 아래 값을 채워 주세요. */
window.REPO = {
  owner: '',    // 예: 'xowonim'
  repo: '',     // 예: 'my-characters'
  branch: ''    // 비워 두면 기본 브랜치
};

/* 선택형 항목 (tone: blue / green / red / gray) */
window.OPTIONS = {
  songs: [],       // 악곡 자동완성 목록 예: ['오마카세']
  buzz: [
    { v: '버즈O', tone: 'green' },
    { v: '버즈X', tone: 'gray' }
  ],
  record: [
    { v: '녹화', tone: 'green' },
    { v: '미녹화', tone: 'red' }
  ]
};
