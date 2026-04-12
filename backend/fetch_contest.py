import time
import requests


def fetch_contest_list():
    """获取比赛列表（第一页）"""
    url = "https://www.luogu.com.cn/contest/list"
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "x-luogu-type": "content-only",
        "x-lentille-request": "content-only",
    }
    try:
        response = requests.get(url, headers=headers, timeout=15)
        if response.status_code != 200:
            return None
        data = response.json()
        contests = data.get("data", {}).get("contests", {}).get("result", [])
        return contests
    except Exception as e:
        print(f"[get contest] 请求失败: {e}")
        return None


def fetch_contest_detail(contest_id: int):
    """获取单场比赛详情"""
    url = f"https://www.luogu.com.cn/contest/{contest_id}"
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "x-luogu-type": "content-only",
        "x-lentille-request": "content-only",
    }
    try:
        response = requests.get(url, headers=headers, timeout=15)
        if response.status_code != 200:
            return None
        data = response.json()
        return data.get("data", {}).get("contest", {})
    except Exception as e:
        print(f"[get contest] 获取比赛详情失败 ({contest_id}): {e}")
        return None


def get_upcoming_contests(hours: int = 24):
    """返回未来 hours 内开始的比赛列表"""
    contests = fetch_contest_list()
    if not contests:
        return []
    now = time.time()
    return [
        c for c in contests
        if now < c.get("startTime", 0) <= now + hours * 3600
    ]


if __name__ == "__main__":
    # Test
    result = fetch_contest_list()
    if result is not None:
        print(f"共获取到 {len(result)} 场比赛")
        for c in result:
            print(f"  ID: {c['id']}  名称: {c['name']}")
    else:
        print("未能获取比赛列表")
