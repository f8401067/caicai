import { LotteryType, WinnerRegion, Prize, LOTTERY_CONFIGS } from '../types'
import { API_CONFIG } from './apiConfig'

/**
 * 体彩各彩种对应的URL路径
 */
const SPORT_LOTTERY_URLS: Record<LotteryType, string> = {
  [LotteryType.DALETOU]: '/mkjdlt/',
  [LotteryType.PAILIE3]: '/mkjpls/',
  [LotteryType.PAILIE5]: '/mkjplw/',
  [LotteryType.QIXINGCAI]: '/mkjqxc/',
  [LotteryType.SHUANGSEQIU]: '', // 双色球是福彩
  [LotteryType.FUCAI3D]: '', // 福彩3D是福彩
}

/**
 * 福彩各彩种对应的URL路径
 */
const WELFARE_LOTTERY_URLS: Record<LotteryType, string> = {
  [LotteryType.SHUANGSEQIU]: '/html5/ygkj/wqkjgg/ssq/',
  [LotteryType.FUCAI3D]: '/html5/ygkj/wqkjgg/fc3d/',
  [LotteryType.DALETOU]: '',
  [LotteryType.PAILIE3]: '',
  [LotteryType.PAILIE5]: '',
  [LotteryType.QIXINGCAI]: '',
}

/**
 * 判断彩票类型是体彩还是福彩
 */
function isSportLottery(type: LotteryType): boolean {
  return [
    LotteryType.DALETOU,
    LotteryType.PAILIE3,
    LotteryType.PAILIE5,
    LotteryType.QIXINGCAI
  ].includes(type)
}

/**
 * 尝试从体彩官网获取开奖详情
 */
async function fetchSportLotteryDetail(type: LotteryType, issue: string): Promise<Prize[] | null> {
  try {
    const path = SPORT_LOTTERY_URLS[type]
    if (!path) return null

    const response = await fetch(`${API_CONFIG.lotteryGov.baseUrl}${path}`)
    if (!response.ok) return null

    const html = await response.text()
    
    // 这里需要根据实际网页结构来解析
    // 由于体彩官网可能有动态内容和反爬机制，我们先返回空结果
    console.log(`尝试获取体彩${LOTTERY_CONFIGS[type].name}第${issue}期详情`)
    
    return null
  } catch (error) {
    console.error('获取体彩开奖详情失败:', error)
    return null
  }
}

/**
 * 尝试从福彩官网获取开奖详情
 */
async function fetchWelfareLotteryDetail(type: LotteryType, issue: string): Promise<Prize[] | null> {
  try {
    const path = WELFARE_LOTTERY_URLS[type]
    if (!path) return null

    const response = await fetch(`${API_CONFIG.cwlGov.baseUrl}${path}`)
    if (!response.ok) return null

    const html = await response.text()
    
    // 这里需要根据实际网页结构来解析
    console.log(`尝试获取福彩${LOTTERY_CONFIGS[type].name}第${issue}期详情`)
    
    return null
  } catch (error) {
    console.error('获取福彩开奖详情失败:', error)
    return null
  }
}

/**
 * 获取开奖详情（包含中奖地区信息）
 */
export async function fetchLotteryRegions(
  type: LotteryType,
  issue: string,
  prizes: Prize[]
): Promise<Prize[]> {
  try {
    let detailPrizes: Prize[] | null = null

    if (isSportLottery(type)) {
      detailPrizes = await fetchSportLotteryDetail(type, issue)
    } else {
      detailPrizes = await fetchWelfareLotteryDetail(type, issue)
    }

    if (detailPrizes) {
      // 如果获取到了详情，合并到现有奖项中
      return prizes.map(prize => {
        const detailPrize = detailPrizes.find(dp => dp.name === prize.name)
        if (detailPrize && detailPrize.regions) {
          return { ...prize, regions: detailPrize.regions }
        }
        return prize
      })
    }

    // 如果没有获取到详情，返回模拟数据供演示
    return addMockRegions(type, prizes)
  } catch (error) {
    console.error('获取开奖详情失败:', error)
    // 出错时返回模拟数据
    return addMockRegions(type, prizes)
  }
}

/**
 * 添加模拟的中奖地区数据（用于演示）
 */
function addMockRegions(type: LotteryType, prizes: Prize[]): Prize[] {
  return prizes.map(prize => {
    // 只给一等奖和二等奖添加地区信息
    if (!['一等奖', '二等奖'].includes(prize.name)) {
      return prize
    }

    if (prize.num === 0) {
      return prize
    }

    const regions: WinnerRegion[] = []
    
    if (isSportLottery(type)) {
      // 体彩：只显示省份
      const provinces = ['北京', '上海', '广东', '浙江', '江苏', '山东', '四川', '湖北']
      const used = new Set<string>()
      
      for (let i = 0; i < Math.min(prize.num, provinces.length); i++) {
        let province = provinces[i % provinces.length]
        while (used.has(province)) {
          province = provinces[Math.floor(Math.random() * provinces.length)]
        }
        used.add(province)
        regions.push({
          province,
          count: 1
        })
      }
    } else {
      // 福彩：显示城市
      const cities = [
        { province: '北京', city: '北京' },
        { province: '上海', city: '上海' },
        { province: '广东', city: '广州' },
        { province: '广东', city: '深圳' },
        { province: '浙江', city: '杭州' },
        { province: '浙江', city: '宁波' },
        { province: '江苏', city: '南京' },
        { province: '江苏', city: '苏州' },
        { province: '山东', city: '济南' },
        { province: '山东', city: '青岛' },
      ]
      const used = new Set<string>()
      
      for (let i = 0; i < Math.min(prize.num, cities.length); i++) {
        let city = cities[i % cities.length]
        let key = `${city.province}-${city.city}`
        while (used.has(key)) {
          city = cities[Math.floor(Math.random() * cities.length)]
          key = `${city.province}-${city.city}`
        }
        used.add(key)
        regions.push({
          province: city.province,
          city: city.city,
          count: 1
        })
      }
    }

    return {
      ...prize,
      regions
    }
  })
}
