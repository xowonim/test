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
    (메시 컬러는 haircolor 폴더를 함께 씁니다. meshcolor 폴더는 필요 없습니다.)
    images/parts/hairdeco    헤어 데코
    images/parts/makeup      메이크업
    images/parts/onepoint    원 포인트
    images/parts/jewel       부탁해 주얼

  [파일 이름 규칙]
    ひたむき.webp             -> 이름: ひたむき
    ひたむき__설명.webp       -> 이름: ひたむき, 설명: 설명
    01_ひたむき.webp          -> 이름: ひたむき (01은 정렬 순서로만 쓰이고 표시되지 않음)
    02 ふんわり__설명.webp    -> 번호 뒤에는 _ 공백 . - 중 하나를 붙입니다.
  - 번호가 있는 파츠가 먼저, 번호 순서대로 나열됩니다. 번호가 없는 파츠는 그 뒤에 이름순으로 나옵니다.
  - 이름과 설명 사이는 밑줄 두 개입니다.
  - 파일 이름(번호 포함)을 나중에 바꿔도, 이미지가 같으면 캐릭터에 선택해 둔 파츠가 자동으로 이어집니다.
    (바꾼 뒤 캐릭터 편집 페이지를 한 번 열면 반영되고, 이미지 파일 자체를 다른 그림으로 교체하면 이어지지 않습니다.)
*/

/* 저장소 정보: 깃허브 페이지 주소에서 자동으로 읽습니다.
   주소가 다르거나 직접 지정하고 싶을 때만 아래 값을 채워 주세요. */
window.REPO = {
  owner: '',    // 예: 'xowonim'
  repo: '',     // 예: 'my-characters'
  branch: ''    // 비워 두면 기본 브랜치
};

/* 파츠 이미지 폴더 (저장소 기준 경로, 항목 폴더의 윗단계까지만 적습니다) */
window.PARTS_DIR = 'images/parts';

/* 같은 폴더를 함께 쓰는 항목 (항목: 사용할 폴더). 선택값은 항목마다 따로 저장됩니다. */
window.PARTS_SHARE = {
  meshcolor: 'haircolor'
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
