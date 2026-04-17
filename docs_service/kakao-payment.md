단건 결제
이 문서는 카카오페이 단건 결제 사용 방법을 안내합니다.

단건 결제는 한 번의 결제로 지불이 완료되는 구매건에 해당하며, 정기적으로 여러 차례 결제가 발생하는 결제인 정기 결제와 다릅니다.
일반적인 상품 판매나 비용 지불 시 단건 결제를 사용합니다.

단건 결제 시 가맹점 코드(CID)가 필요합니다.
- 카카오페이와 제휴를 통해 애플리케이션> ClientID를 전달 주시면 가맹점코드(CID)를 발급해 드립니다.
- 테스트 결제는, 가맹점 코드로 "TC0ONETIME"와 "Secret key(dev)"를 통해 결제 호출이 가능합니다.

결제준비(ready)
카카오페이 결제를 시작하기 위해 결제정보를 카카오페이 서버에 전달하고 결제 고유번호(TID)와 URL을 응답받는 단계입니다.

Secret key를 헤더에 담아 파라미터 값들과 함께 POST로 요청합니다.
요청이 성공하면 응답 바디에 JSON 객체로 다음 단계 진행을 위한 값들을 받습니다.
서버(Server)는 tid를 저장하고, 클라이언트는 사용자 환경에 맞는 URL로 리다이렉트(redirect)합니다.
Request
Request Syntax
POST /online/v1/payment/ready HTTP/1.1
Host: open-api.kakaopay.com
Authorization: SECRET_KEY ${SECRET_KEY}
Content-Type: application/json
Request Body Payload
Name	Data Type	Required	Description
cid	String	O	가맹점 코드, 10자
cid_secret	String	X	가맹점 코드 인증키, 24자, 숫자와 영문 소문자 조합
partner_order_id	String	O	가맹점 주문번호, 최대 100자
partner_user_id	String	O	가맹점 회원 id, 최대 100자
(실명, 휴대폰번호, 이메일주소, ID와 같은 개인정보 전송 불가)
item_name	String	O	상품명, 최대 100자
item_code	String	X	상품코드, 최대 100자
quantity	Integer	O	상품 수량
total_amount	Integer	O	상품 총액
tax_free_amount	Integer	O	상품 비과세 금액
vat_amount	Integer	X	상품 부가세 금액
값을 보내지 않을 경우 다음과 같이 VAT 자동 계산
(상품총액 - 상품 비과세 금액)/11 : 소수점 이하 반올림
green_deposit	Integer	X	컵 보증금
approval_url	String	O	결제 성공 시 redirect url, 최대 255자
cancel_url	String	O	결제 취소 시 redirect url, 최대 255자
fail_url	String	O	결제 실패 시 redirect url, 최대 255자
available_cards	JSON Array	X	결제 수단으로써 사용 허가할 카드사를 지정해야 하는 경우 사용
카카오페이와 사전 협의 필요
사용 허가할 카드사 코드*의 배열
ex) ["HANA", "BC"]
(기본값: 모든 카드사 허용)
payment_method_type	String	X	사용 허가할 결제 수단, 지정하지 않으면 모든 결제 수단 허용
CARD 또는 MONEY 중 하나
install_month	Integer	X	카드 할부개월, 0~12
use_share_installment	String	X	분담무이자 설정 (Y/N), 사용 시 사전 협의 필요
custom_json	JSON Map
{String:String}	X	부가기능 가이드 참조
redirect_scheme_url	String	X	부가기능 가이드 참조
카드사 코드* : SHINHAN, KB, HYUNDAI, LOTTE, SAMSUNG, NH, BC, HANA, CITI, KAKAOBANK, KAKAOPAY, WOORIONLY
KAKAOBANK, KAKAOPAY, CITY는 KB/BC에 미포함, 별도 지정 필요
SUHYUP, SHINHYUP, JEONBUK, JEJU, SC 등 기타 상세 분류가 필요한 경우 협의필요
컵 보증금(green_deposit) 사용 시 부분 취소 불가
Response
Response Body Payload
Name	Data Type	Description
tid	String	결제 고유 번호, 20자
next_redirect_app_url	String	요청한 클라이언트(Client)가 모바일 앱일 경우
카카오톡 결제 페이지 Redirect URL
next_redirect_mobile_url	String	요청한 클라이언트가 모바일 웹일 경우
카카오톡 결제 페이지 Redirect URL
next_redirect_pc_url	String	요청한 클라이언트가 PC 웹일 경우
카카오톡으로 결제 요청 메시지(TMS)를 보내기 위한 사용자 정보 입력 화면 Redirect URL
created_at	Datetime	결제 준비 요청 시간
Sample
Request
curl --location 'https://open-api.kakaopay.com/online/v1/payment/ready' \
--header 'Authorization: SECRET_KEY ${SECRET_KEY}' \
--header 'Content-Type: application/json' \
--data '{
		"cid": "TC0ONETIME",
		"partner_order_id": "partner_order_id",
		"partner_user_id": "partner_user_id",
		"item_name": "초코파이",
		"quantity": "1",
		"total_amount": "2200",
		"vat_amount": "200",
		"tax_free_amount": "0",
		"approval_url": "https://developers.kakao.com/success",
		"fail_url": "https://developers.kakao.com/fail",
		"cancel_url": "https://developers.kakao.com/cancel"
	}'
Response: 정상적으로 요청에 성공한 경우
HTTP/1.1 200 OK
Content-type: application/json;charset=UTF-8
{
  "tid": "T1234567890123456789",
  "next_redirect_app_url": "https://mockup-pg-web.kakao.com/v1/xxxxxxxxxx/aInfo",
  "next_redirect_mobile_url": "https://mockup-pg-web.kakao.com/v1/xxxxxxxxxx/mInfo",
  "next_redirect_pc_url": "https://mockup-pg-web.kakao.com/v1/xxxxxxxxxx/info",
  "created_at": "2023-07-15T21:18:22"
}
결제 요청 - 사용자 결제 수단 선택
결제 준비(ready) API의 응답으로 받은 Redirect URL 중 사용자 접속 환경에 맞는 URL을 선택해 오픈을 실행합니다.
클라이언트에는 결제 대기 화면이 노출되며, 사용자는 카카오톡 결제 화면에서 결제 수단을 선택할 수 있습니다.

이 프로세스는 카카오페이의 서비스 화면에서 일어나기 때문에 가맹점으로 다른 요청을 보내지 않습니다.
사용자의 접속 환경별로 고려해야 되는 내용은 아래와 같습니다.

공통
결제 대기 화면은 사용자가 카카오톡 결제 화면에서 결제 수단을 선택할 때까지 카운트다운을 하며, 결제 상태를 지속적으로 직접 체크(polling 방식)합니다.

사용자가 카카오톡 결제 화면에서 결제 수단을 선택하고 비밀번호 인증까지 마치면, 결제 대기 화면은 결제 준비 API 요청 시 전달받은 approval_url에 pg_token 파라미터를 붙여 대기화면을 approval_url로 redirect 합니다. pg_token은 결제 승인 API 호출 시 사용합니다.

next_redirect_pc_url
결제 준비 API 응답으로 받으며, PC 환경에서 사용합니다. URL을 팝업(Popup) 또는 레이어(Layer) 방식으로 띄웁니다.
QR 코드를 통해 결제 수단으로 전환할 수 있습니다.
사용자가 생년월일과 휴대전화 번호를 입력하여 카카오톡 메시지를 보내 결제 요청할 수 있습니다.

next_redirect_mobile_url
결제 준비 API 응답으로 받으며, 모바일 웹 환경에서 사용합니다.
URL을 웹뷰(Web view)로 띄웁니다. (iframe은 방식은 지양합니다.)
iOS의 경우, canOpenURL 사용 시 Info.plist 아래 LSApplicationQueriesSchemes 키 값에 "kakaotalk" 스킴(Scheme)을 추가해야 합니다.

next_redirect_app_url
결제 준비 API 응답으로 받으며, 모바일 앱 환경에서 사용합니다.
카카오톡 결제 화면으로 이동하는 커스텀 앱 스킴(Custom App Scheme)을 자동 호출하며, 해당 URL을 웹뷰로 띄웁니다. (iframe은 방식은 지양합니다.)
iOS의 경우, canOpenURL 사용 시 Info.plist 아래 LSApplicationQueriesSchemes 키 값에 "kakaotalk" 스킴(Scheme)을 추가해야 합니다.

결제승인(approve)
사용자가 결제 수단을 선택하고 비밀번호를 입력해 결제 인증을 완료한 뒤, 최종적으로 결제 완료 처리를 하는 단계입니다.

인증완료 시 응답받은 pg_token과 tid로 최종 승인요청합니다.
결제 승인 API를 호출하면 결제 준비 단계에서 시작된 결제 건이 승인으로 완료 처리됩니다.
결제 승인 요청이 실패하면 카드사 등 결제 수단의 실패 정보가 필요에 따라 포함될 수 있습니다.
Request
Request Syntax
POST /online/v1/payment/approve HTTP/1.1
Host: open-api.kakaopay.com
Authorization: SECRET_KEY ${SECRET_KEY}
Content-Type: application/json
Request Body Payload
Name	Data Type	Required	Description
cid	String	O	가맹점 코드, 10자
cid_secret	String	X	가맹점 코드 인증키, 24자, 숫자+영문 소문자 조합
tid	String	O	결제 고유번호, 결제 준비 API 응답에 포함
partner_order_id	String	O	가맹점 주문번호, 결제 준비 API 요청과 일치해야 함
partner_user_id	String	O	가맹점 회원 id, 결제 준비 API 요청과 일치해야 함
pg_token	String	O	결제승인 요청을 인증하는 토큰
사용자 결제 수단 선택 완료 시, approval_url로 redirection 해줄 때 pg_token을 query string으로 전달
payload	String	X	결제 승인 요청에 대해 저장하고 싶은 값, 최대 200자
total_amount	Integer	X	상품 총액, 결제 준비 API 요청과 일치해야 함
Response
Response Body Payload
Name	Data Type	Description
aid	String	요청 고유 번호 - 승인/취소가 구분된 결제번호
tid	String	결제 고유 번호 - 승인/취소가 동일한 결제번호
cid	String	가맹점 코드
sid	String	정기 결제용 ID, 정기 결제 CID로 단건 결제 요청 시 발급
partner_order_id	String	가맹점 주문번호, 최대 100자
partner_user_id	String	가맹점 회원 id, 최대 100자
payment_method_type	String	결제 수단, CARD 또는 MONEY 중 하나
amount	Amount	결제 금액 정보
card_info	CardInfo	결제 상세 정보, 결제 수단이 카드일 경우만 포함
item_name	String	상품 이름, 최대 100자
item_code	String	상품 코드, 최대 100자
quantity	Integer	상품 수량
created_at	Datetime	결제 준비 요청 시각
approved_at	Datetime	결제 승인 시각
payload	String	결제 승인 요청에 대해 저장한 값, 요청 시 전달된 내용

amount(JSON)
Name	Data Type	Description
total	Integer	전체 결제 금액
tax_free	Integer	비과세 금액
vat	Integer	부가세 금액
point	Integer	사용한 포인트 금액
discount	Integer	할인 금액
green_deposit	Integer	컵 보증금

card_info(JSON)
Name	Data Type	Description
kakaopay_purchase_corp	String	카카오페이 매입사명
kakaopay_purchase_corp_code	String	카카오페이 매입사 코드
kakaopay_issuer_corp	String	카카오페이 발급사명
kakaopay_issuer_corp_code	String	카카오페이 발급사 코드
bin	String	카드 BIN
card_type	String	카드 타입
install_month	String	할부 개월 수
approved_id	String	카드사 승인번호
card_mid	String	카드사 가맹점 번호
interest_free_install	String	무이자할부 여부(Y/N)
installment_type	String	할부 유형(24.02.01일부터 제공)
- CARD_INSTALLMENT: 업종 무이자
- SHARE_INSTALLMENT: 분담 무이자
card_item_code	String	카드 상품 코드
Sample
Request
curl --location 'https://open-api.kakaopay.com/online/v1/payment/approve' \
--header 'Authorization: SECRET_KEY ${SECRET_KEY}' \
--header 'Content-Type: application/json' \
--data '{
		"cid": "TC0ONETIME",
		"tid": "T1234567890123456789",
		"partner_order_id": "partner_order_id",
		"partner_user_id": "partner_user_id",
		"pg_token": "xxxxxxxxxxxxxxxxxxxx"
	}'
Response: 결제 수단 MONEY일 때 성공
HTTP/1.1 200 OK
Content-type: application/json;charset=UTF-8
{
  "aid": "A5678901234567890123",
  "tid": "T1234567890123456789",
  "cid": "TC0ONETIME",
  "partner_order_id": "partner_order_id",
  "partner_user_id": "partner_user_id",
  "payment_method_type": "MONEY",
  "item_name": "초코파이",
  "quantity": 1,
  "amount": {
    "total": 2200,
    "tax_free": 0,
    "vat": 200,
    "point": 0,
    "discount": 0,
    "green_deposit": 0
  },
  "created_at": "2023-07-15T21:18:22",
  "approved_at": "2023-07-15T21:18:22"
}
Response: 결제 수단 CARD일 때 성공
HTTP/1.1 200 OK
Content-type: application/json;charset=UTF-8
{
  "cid": "TC0ONETIME",
  "aid": "A5678901234567890123",
  "tid": "T1234567890123456789",
  "partner_user_id": "partner_user_id",
  "partner_order_id": "partner_order_id",
  "payment_method_type": "CARD",
  "item_name": "초코파이",
  "quantity": 1,
  "amount": {
    "total": 2200,
    "tax_free": 0,
    "vat": 200,
    "discount": 0,
    "point": 0,
    "green_deposit": 0
  },
  "card_info": {
    "interest_free_install": "N",
    "bin": "621640",
    "card_type": "체크",
    "card_mid": "123456789",
    "approved_id": "12345678",
    "install_month": "00",
    "installment_type": "CARD_INSTALLMENT",
    "kakaopay_purchase_corp": "비씨카드",
    "kakaopay_purchase_corp_code": "104",
    "kakaopay_issuer_corp": "수협은행",
    "kakaopay_issuer_corp_code": "212"
  },
  "created_at": "2023-07-15T21:18:22",
  "approved_at": "2023-07-15T21:18:22"
}
Response: 결제 수단 승인 실패
HTTP/1.1 400 Bad Request
Content-type: application/json;charset=UTF-8     
{
  "error_code": -780,
  "error_message": "approval failure!",
  "extras": {
    "method_result_code": "USER_LOCKED",
    "method_result_message": "진행중인 거래가 있습니다. 잠시 후 다시 시도해 주세요."
  }
}