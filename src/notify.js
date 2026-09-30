const fs = require("fs");
const path = require("path");

const vacationsPath = path.join(
    __dirname,
    "../data/vacations.json"
);

const vacations = JSON.parse(
    fs.readFileSync(vacationsPath, "utf-8")
);

const webhookUrl = process.env.SLACK_WEBHOOK_URL;

if (!webhookUrl) {
    throw new Error("SLACK_WEBHOOK_URL이 설정되지 않았습니다.");
}

/**
 * YYYY-MM-DD 형식의 한국 날짜 반환
 */
function getKoreanDate() {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
}

/**
 * 2026-10-05 → 10/5
 */
function formatDate(date) {
    const [, month, day] = date.split("-");

    return `${Number(month)}/${Number(day)}`;
}

/**
 * 오늘 연락 어려운 사람 찾기
 */
function getTodayVacations(today) {
    return vacations.filter(({ startDate, endDate }) => {
        return startDate <= today && today <= endDate;
    });
}

/**
 * Slack 메시지 생성
 */
function createMessage(unavailableMembers) {
    const lines = unavailableMembers.map(
        ({ name, startDate, endDate }) => {
            if (startDate === endDate) {
                return `• *${name}* — ${formatDate(startDate)}`;
            }

            return `• *${name}* — ${formatDate(startDate)} ~ ${formatDate(endDate)}`;
        }
    );

    return [
        "📢 *오늘 연락이 어려운 팀원입니다.*",
        "",
        ...lines,
        "",
        "일정에 참고해주세요 🙂",
    ].join("\n");
}

async function sendSlackMessage(message) {
    const response = await fetch(webhookUrl, {
        method: "POST",

        headers: {
            "Content-Type": "application/json",
        },

        body: JSON.stringify({
            text: message,
        }),
    });

    if (!response.ok) {
        const error = await response.text();

        throw new Error(
            `Slack 전송 실패: ${response.status} ${error}`
        );
    }
}

async function main() {
    const today = getKoreanDate();

    console.log(`오늘 날짜: ${today}`);

    const todayVacations = getTodayVacations(today);

    if (todayVacations.length === 0) {
        console.log("오늘 연락이 어려운 팀원이 없습니다.");
        return;
    }

    const message = createMessage(todayVacations);

    console.log(message);

    await sendSlackMessage(message);

    console.log("Slack 알림 전송 완료");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});