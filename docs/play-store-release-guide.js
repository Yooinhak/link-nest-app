const fs = require('fs');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  Header,
  Footer,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  WidthType,
  ShadingType,
  PageNumber,
  PageBreak,
  LevelFormat,
  ExternalHyperlink,
} = require('docx');

const accent = '2E75B6';
const lightBg = 'E8F3FF';
const grayBg = 'F2F4F6';
const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

const h1 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, bold: true, size: 32, font: 'Arial', color: accent })],
  });
const h2 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 160 },
    children: [new TextRun({ text, bold: true, size: 26, font: 'Arial', color: '333333' })],
  });
const p = (text, opts = {}) =>
  new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text, size: 22, font: 'Arial', ...opts })] });
const bold = (text) => new TextRun({ text, bold: true, size: 22, font: 'Arial' });
const normal = (text) => new TextRun({ text, size: 22, font: 'Arial' });
const code = (text) => new TextRun({ text, size: 20, font: 'Courier New', color: 'C7254E' });

const numbering = {
  config: [
    {
      reference: 'steps',
      levels: [
        {
          level: 0,
          format: LevelFormat.DECIMAL,
          text: '%1.',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        },
      ],
    },
    {
      reference: 'bullets',
      levels: [
        {
          level: 0,
          format: LevelFormat.BULLET,
          text: '•',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        },
      ],
    },
    {
      reference: 'sub',
      levels: [
        {
          level: 0,
          format: LevelFormat.BULLET,
          text: '◦',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1080, hanging: 360 } } },
        },
      ],
    },
  ],
};

const step = (text) =>
  new Paragraph({
    numbering: { reference: 'steps', level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text, size: 22, font: 'Arial' })],
  });
const bullet = (runs) =>
  new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing: { after: 60 },
    children: Array.isArray(runs) ? runs : [new TextRun({ text: runs, size: 22, font: 'Arial' })],
  });
const sub = (text) =>
  new Paragraph({
    numbering: { reference: 'sub', level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, size: 22, font: 'Arial' })],
  });

function makeCell(text, width, opts = {}) {
  const runs = Array.isArray(text) ? text : [new TextRun({ text, size: 20, font: 'Arial', ...opts })];
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    margins: cellMargins,
    shading: opts.header
      ? { fill: accent, type: ShadingType.CLEAR }
      : opts.bg
        ? { fill: opts.bg, type: ShadingType.CLEAR }
        : undefined,
    children: [new Paragraph({ children: runs })],
  });
}

const doc = new Document({
  numbering,
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      {
        id: 'Heading1',
        name: 'Heading 1',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { size: 32, bold: true, font: 'Arial', color: accent },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 },
      },
      {
        id: 'Heading2',
        name: 'Heading 2',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { size: 26, bold: true, font: 'Arial', color: '333333' },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 },
      },
    ],
  },
  sections: [
    {
      properties: {
        page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: 'Linkle — Google Play Store 출시 가이드',
                  size: 16,
                  font: 'Arial',
                  color: '999999',
                }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'Page ', size: 16, font: 'Arial', color: '999999' }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, font: 'Arial', color: '999999' }),
              ],
            }),
          ],
        }),
      },
      children: [
        // Title
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [new TextRun({ text: 'Linkle', size: 48, bold: true, font: 'Arial', color: accent })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: 'Google Play Store 출시 가이드', size: 36, bold: true, font: 'Arial' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [
            new TextRun({
              text: 'React Native (Expo SDK 55) + Supabase · Bundle ID: dev.inak.linkle',
              size: 20,
              font: 'Arial',
              color: '666666',
            }),
          ],
        }),

        // Overview
        h1('📋 전체 프로세스 요약'),
        p('아래 7단계를 순서대로 진행하면 출시까지 완료됩니다.'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [600, 3200, 2800, 2760],
          rows: [
            new TableRow({
              children: [
                makeCell('단계', 600, { header: true, color: 'FFFFFF', bold: true }),
                makeCell('작업', 3200, { header: true, color: 'FFFFFF', bold: true }),
                makeCell('필요 시간', 2800, { header: true, color: 'FFFFFF', bold: true }),
                makeCell('비용', 2760, { header: true, color: 'FFFFFF', bold: true }),
              ],
            }),
            ...[
              ['1', 'Google Play 개발자 계정 생성', '1일 (본인인증 포함)', '$25 (일회성)'],
              ['2', 'EAS 프로젝트 초기화', '10분', '무료 (30회/월)'],
              ['3', 'Google Service Account Key 생성', '15분', '무료'],
              ['4', 'AAB 프로덕션 빌드', '15~30분 (EAS 클라우드)', '무료'],
              ['5', 'Play Console에 첫 번째 AAB 수동 업로드', '20분', '무료'],
              ['6', '스토어 등록 정보 작성', '1~2시간', '무료'],
              ['7', '심사 제출 및 대기', '3일~2주', '무료'],
            ].map(
              (r) =>
                new TableRow({
                  children: r.map((c, i) =>
                    makeCell(c, [600, 3200, 2800, 2760][i], { bg: r[0] % 2 === 0 ? grayBg : undefined }),
                  ),
                }),
            ),
          ],
        }),
        p(''),

        // Step 1
        h1('1단계: Google Play 개발자 계정 생성'),
        step('Google Play Console (play.google.com/console) 접속'),
        step('계정 유형 선택: 개인 또는 조직'),
        step('등록 수수료 $25 결제 (GPay, 신용/체크카드)'),
        step('본인 인증: 이름, 주소, 연락처, 신분증 제출'),
        step('Android 기기 인증: Play Console 모바일 앱을 실기기에서 실행'),
        p(''),
        p('주의: 본인인증에 1~2일 소요될 수 있습니다. 빌드 작업과 병행하세요.', { italics: true, color: '666666' }),

        // Step 2
        new Paragraph({ children: [new PageBreak()] }),
        h1('2단계: EAS 프로젝트 초기화'),
        h2('2-1. EAS CLI 설치 및 로그인'),
        p('터미널에서 다음을 실행합니다:'),
        new Paragraph({
          spacing: { before: 80, after: 80 },
          shading: { fill: grayBg, type: ShadingType.CLEAR },
          indent: { left: 360 },
          children: [code('npm install -g eas-cli')],
        }),
        new Paragraph({
          spacing: { before: 80, after: 80 },
          shading: { fill: grayBg, type: ShadingType.CLEAR },
          indent: { left: 360 },
          children: [code('eas login')],
        }),
        p(''),
        h2('2-2. eas.json 생성'),
        p('프로젝트 루트에서:'),
        new Paragraph({
          spacing: { before: 80, after: 80 },
          shading: { fill: grayBg, type: ShadingType.CLEAR },
          indent: { left: 360 },
          children: [code('eas init')],
        }),
        p(''),
        p('아래와 같이 eas.json을 설정합니다:'),
        new Paragraph({
          spacing: { after: 40 },
          shading: { fill: grayBg, type: ShadingType.CLEAR },
          indent: { left: 360 },
          children: [code('{'), normal('')],
        }),
        new Paragraph({
          shading: { fill: grayBg, type: ShadingType.CLEAR },
          indent: { left: 360 },
          children: [code('  "build": {')],
        }),
        new Paragraph({
          shading: { fill: grayBg, type: ShadingType.CLEAR },
          indent: { left: 360 },
          children: [code('    "development": { "developmentClient": true },')],
        }),
        new Paragraph({
          shading: { fill: grayBg, type: ShadingType.CLEAR },
          indent: { left: 360 },
          children: [code('    "preview": { "distribution": "internal" },')],
        }),
        new Paragraph({
          shading: { fill: grayBg, type: ShadingType.CLEAR },
          indent: { left: 360 },
          children: [code('    "production": {}')],
        }),
        new Paragraph({
          shading: { fill: grayBg, type: ShadingType.CLEAR },
          indent: { left: 360 },
          children: [code('  },')],
        }),
        new Paragraph({
          shading: { fill: grayBg, type: ShadingType.CLEAR },
          indent: { left: 360 },
          children: [code('  "submit": {')],
        }),
        new Paragraph({
          shading: { fill: grayBg, type: ShadingType.CLEAR },
          indent: { left: 360 },
          children: [code('    "production": {')],
        }),
        new Paragraph({
          shading: { fill: grayBg, type: ShadingType.CLEAR },
          indent: { left: 360 },
          children: [code('      "android": {')],
        }),
        new Paragraph({
          shading: { fill: grayBg, type: ShadingType.CLEAR },
          indent: { left: 360 },
          children: [code('        "serviceAccountKeyPath": "./pc-api-key.json",')],
        }),
        new Paragraph({
          shading: { fill: grayBg, type: ShadingType.CLEAR },
          indent: { left: 360 },
          children: [code('        "track": "internal"')],
        }),
        new Paragraph({
          shading: { fill: grayBg, type: ShadingType.CLEAR },
          indent: { left: 360 },
          children: [code('      }')],
        }),
        new Paragraph({
          shading: { fill: grayBg, type: ShadingType.CLEAR },
          indent: { left: 360 },
          children: [code('    }')],
        }),
        new Paragraph({
          shading: { fill: grayBg, type: ShadingType.CLEAR },
          indent: { left: 360 },
          children: [code('  }')],
        }),
        new Paragraph({
          spacing: { after: 120 },
          shading: { fill: grayBg, type: ShadingType.CLEAR },
          indent: { left: 360 },
          children: [code('}')],
        }),
        p(''),
        p('track 옵션:'),
        bullet([bold('internal'), normal(' — 내부 테스트 (최초 권장)')]),
        bullet([bold('alpha'), normal(' — 비공개 테스트')]),
        bullet([bold('beta'), normal(' — 공개 베타')]),
        bullet([bold('production'), normal(' — 정식 출시')]),

        // Step 3
        new Paragraph({ children: [new PageBreak()] }),
        h1('3단계: Google Service Account Key 생성'),
        p('EAS Submit이 Play Console API를 통해 앱을 업로드하려면 서비스 계정 키가 필요합니다.'),
        p(''),
        step('Google Cloud Console (console.cloud.google.com) 접속'),
        step('새 프로젝트 생성 또는 기존 프로젝트 선택'),
        step('API 및 서비스 → Google Play Android Developer API 활성화'),
        step('서비스 계정 생성: IAM 및 관리자 → 서비스 계정 → 생성'),
        sub('이름: eas-submit'),
        sub('역할: 기본 에디터 (Editor)'),
        step('키 탭 → 키 추가 → JSON 선택 → 다운로드'),
        step('다운로드된 JSON 파일을 프로젝트 루트에 pc-api-key.json으로 저장'),
        step('Play Console → 설정 → API 액세스 → 새 서비스 계정 연결'),
        sub('서비스 계정 이메일을 붙여넣고 키 권한 부여'),
        p(''),
        new Paragraph({
          spacing: { after: 120 },
          shading: { fill: 'FFF3E0', type: ShadingType.CLEAR },
          indent: { left: 360, right: 360 },
          children: [
            new TextRun({ text: '⚠️ 중요: ', bold: true, size: 22, font: 'Arial' }),
            normal('pc-api-key.json을 .gitignore에 반드시 추가하세요! 이 파일이 git에 커밋되면 API 키가 노출됩니다.'),
          ],
        }),

        // Step 4
        h1('4단계: 프로덕션 빌드 (AAB)'),
        p('터미널에서 실행:'),
        new Paragraph({
          spacing: { before: 80, after: 120 },
          shading: { fill: grayBg, type: ShadingType.CLEAR },
          indent: { left: 360 },
          children: [code('eas build --platform android --profile production')],
        }),
        p(''),
        bullet('EAS 클라우드에서 빌드됩니다 (15~30분 소요)'),
        bullet('첫 빌드 시 서명 키(keystore)를 EAS가 자동 생성합니다'),
        bullet([normal('결과물: '), code('.aab'), normal(' 파일 (Android App Bundle)')]),
        bullet('빌드 완료 후 expo.dev 대시보드에서 다운로드 가능'),
        p(''),
        p('로컬 빌드도 가능합니다:', { italics: true, color: '666666' }),
        new Paragraph({
          spacing: { before: 80, after: 120 },
          shading: { fill: grayBg, type: ShadingType.CLEAR },
          indent: { left: 360 },
          children: [code('eas build --platform android --profile production --local')],
        }),

        // Step 5
        new Paragraph({ children: [new PageBreak()] }),
        h1('5단계: Play Console에 첫 AAB 수동 업로드'),
        new Paragraph({
          spacing: { after: 120 },
          shading: { fill: 'FFF3E0', type: ShadingType.CLEAR },
          indent: { left: 360, right: 360 },
          children: [
            new TextRun({ text: '⚠️ Google 요구사항: ', bold: true, size: 22, font: 'Arial' }),
            normal(
              '첫 번째 AAB는 반드시 Play Console에 직접 업로드해야 합니다. 이후부터 EAS Submit 자동 제출이 가능합니다.',
            ),
          ],
        }),
        p(''),
        step('Play Console → 모든 앱 → 앱 만들기'),
        sub('앱 이름: Linkle'),
        sub('기본 언어: 한국어'),
        sub('앱 또는 게임: 앱'),
        sub('무료 또는 유료: 무료'),
        step('프로덕션 → 국가/지역 → 배포 국가 선택'),
        step('프로덕션 → 릴리스 → 프로덕션 트랙에서 새 버전 만들기'),
        step('4단계에서 빌드한 .aab 파일을 업로드'),
        step('버전 이름 입력 (1.0.0) 및 출시 노트 작성'),

        // Step 6
        h1('6단계: 스토어 등록 정보 작성'),
        p('Play Console의 스토어 등록 정보 섹션을 모두 채워야 심사 제출이 가능합니다.'),
        p(''),
        h2('6-1. 기본 스토어 등록 정보'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2800, 6560],
          rows: [
            new TableRow({
              children: [
                makeCell('항목', 2800, { header: true, color: 'FFFFFF', bold: true }),
                makeCell('Linkle 기준 값', 6560, { header: true, color: 'FFFFFF', bold: true }),
              ],
            }),
            ...[
              ['앱 이름', 'Linkle'],
              ['짧은 설명 (80자)', '발견한 링크를 폴더별로 저장하고 미리보기와 함께 관리하세요'],
              ['긴 설명 (4000자)', '자유롭게 작성 (주요 기능, 차별점 설명)'],
              ['카테고리', '도구 > 생산성'],
              ['연락처 이메일', 'developers_claude@blomics.biz'],
              ['개인정보처리방침 URL', 'docs/privacy-policy.html 호스팅 후 URL'],
            ].map((r) => new TableRow({ children: [makeCell(r[0], 2800, { bold: true }), makeCell(r[1], 6560)] })),
          ],
        }),

        p(''),
        h2('6-2. 스크린샷 요구사항'),
        bullet([bold('최소 2장'), normal(', 권장 4~8장')]),
        bullet([normal('JPEG 또는 24비트 PNG (투명 불가)')]),
        bullet([normal('비율: 16:9 또는 9:16')]),
        bullet([normal('최소 한 변 320px, 최대 3840px')]),
        bullet([normal('파일 크기 8MB 이하')]),
        p(''),
        p('권장 스크린샷 구성:'),
        bullet('홈 화면 (폴더 목록)'),
        bullet('폴더 상세 (링크 카드 목록)'),
        bullet('링크 미리보기 카드 클로즈업'),
        bullet('공유 인텐트 (외부 앱에서 링크 저장)'),

        p(''),
        h2('6-3. 데이터 보안 섹션 (Data Safety)'),
        p('Google Play의 필수 항목입니다. Linkle 기준으로:'),
        p(''),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2400, 2400, 2400, 2160],
          rows: [
            new TableRow({
              children: [
                makeCell('데이터 유형', 2400, { header: true, color: 'FFFFFF', bold: true }),
                makeCell('수집 여부', 2400, { header: true, color: 'FFFFFF', bold: true }),
                makeCell('공유 여부', 2400, { header: true, color: 'FFFFFF', bold: true }),
                makeCell('목적', 2160, { header: true, color: 'FFFFFF', bold: true }),
              ],
            }),
            ...[
              ['이메일', '수집', '미공유', '계정 관리'],
              ['이름', '선택적 수집', '미공유', '계정 프로필'],
              ['프로필 사진', '선택적 수집', '미공유', '아바타 표시'],
              ['URL/북마크', '수집', '미공유', '앱 기능'],
              ['크래시 로그', '수집 (예정)', '미공유 (Sentry)', '앱 안정성'],
            ].map((r) => new TableRow({ children: r.map((c, i) => makeCell(c, [2400, 2400, 2400, 2160][i])) })),
          ],
        }),
        p(''),
        bullet('데이터 암호화: 예 (Supabase TLS + RLS)'),
        bullet('삭제 요청 방법: 앱 내 계정 삭제 기능 (A-3으로 구현 완료)'),

        // Step 6-4
        p(''),
        h2('6-4. 콘텐츠 등급'),
        bullet([normal('모든 사람 (Everyone) — Linkle는 북마크 관리 앱이므로 적합')]),
        bullet([normal('IARC 설문지를 작성하면 자동으로 등급이 부여됩니다')]),

        // Step 7
        new Paragraph({ children: [new PageBreak()] }),
        h1('7단계: 심사 제출 및 출시'),
        step('Play Console → 앱 대시보드 → 모든 체크리스트 항목 초록색 확인'),
        step('프로덕션 → 릴리스 → 출시 준비 시작 (Start rollout to Production)'),
        step('심사 대기 (3일 ~ 2주, 신규 개발자는 더 길 수 있음)'),
        step('승인 후 Play Store에 자동 게시'),
        p(''),
        p('후속 업데이트부터는 EAS Submit으로 자동화 가능:'),
        new Paragraph({
          spacing: { before: 80, after: 120 },
          shading: { fill: grayBg, type: ShadingType.CLEAR },
          indent: { left: 360 },
          children: [code('eas submit --platform android --profile production')],
        }),

        // Checklist
        h1('✅ 출시 전 체크리스트'),
        p(''),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [600, 5760, 3000],
          rows: [
            new TableRow({
              children: [
                makeCell('', 600, { header: true }),
                makeCell('항목', 5760, { header: true, color: 'FFFFFF', bold: true }),
                makeCell('상태', 3000, { header: true, color: 'FFFFFF', bold: true }),
              ],
            }),
            ...[
              ['☐', 'Google Play 개발자 계정 등록 + 본인인증', '미완료'],
              ['☐', 'eas.json 생성', '미완료'],
              ['☐', 'Google Service Account Key 발급 + 연결', '미완료'],
              ['☐', 'eas build --platform android --profile production', '미완료'],
              ['☐', 'Play Console에 첫 AAB 수동 업로드', '미완료'],
              ['☑', '개인정보처리방침 HTML 작성 (A-5)', '코드 완료'],
              ['☑', '계정 삭제 기능 (A-3)', '코드 완료'],
              ['☐', '개인정보처리방침 URL 호스팅 (G-7)', '미완료'],
              ['☐', '스크린샷 4~8장 준비', '미완료'],
              ['☐', '데이터 보안 섹션 작성', '미완료'],
              ['☐', '콘텐츠 등급 (IARC) 설문지', '미완료'],
              ['☑', '앱 아이콘 (adaptive icon 3종)', '완료'],
              ['☐', 'OAuth 리다이렉트 URL 등록 (G-3)', '미완료'],
              ['☐', 'Supabase Edge Function 배포 (G-1)', '미완료'],
            ].map(
              (r) =>
                new TableRow({
                  children: [
                    makeCell(r[0], 600, {}),
                    makeCell(r[1], 5760, {}),
                    makeCell(r[2], 3000, {
                      color: r[2] === '미완료' ? 'CC0000' : r[2].includes('완료') ? '007700' : undefined,
                    }),
                  ],
                }),
            ),
          ],
        }),

        // Tips
        p(''),
        h1('💡 팁'),
        bullet([
          bold('internal 트랙부터 시작하세요'),
          normal('. 본인만 테스트하고, 안정적이면 production으로 승격하면 됩니다.'),
        ]),
        bullet([
          bold('심사 기간이 길 수 있습니다'),
          normal('. 신규 개발자는 최대 2주까지 걸릴 수 있으니 여유를 두세요.'),
        ]),
        bullet([
          bold('pc-api-key.json을 절대 git에 커밋하지 마세요'),
          normal('. .gitignore에 추가하고, CI에서는 eas secret으로 관리합니다.'),
        ]),
        bullet([
          bold('AAB 서명 키는 EAS가 관리합니다'),
          normal('. Play App Signing을 사용하면 업로드 키만 EAS에 보관되고, 서명 키는 Google이 관리합니다.'),
        ]),
        bullet([bold('EAS 무료 플랜은 월 30회 빌드'), normal('. 개인 개발에는 충분합니다.')]),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync('/sessions/clever-determined-euler/mnt/linkle-app/docs/play-store-release-guide.docx', buffer);
  console.log('DONE: play-store-release-guide.docx');
});
