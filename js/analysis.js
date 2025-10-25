/**
 * 分析功能模块
 * 包含人流量分析和综合决策分析功能
 */

/**
 * 人流量智能分析和最佳游览时间推荐
 * @param {Array} attractions - 景点列表
 * @param {Object} userPreferences - 用户偏好设置
 * @param {Object} weatherInfo - 天气信息
 * @returns {Object} 人流量分析结果
 */
function analyzeCrowdAndOptimalTime(attractions, userPreferences, weatherInfo) {
    const crowdAnalysis = {
        attractions: [],
        recommendations: [],
        optimalTimes: {}
    };

    // 人流量等级定义
    const getCrowdLevel = (attractionName, timeSlot, season, weather) => {
        // 基础人流量数据（模拟）
        const baseCrowdData = {
            '故宫': { base: 8, peak: [10, 11, 14, 15], low: [8, 9, 16, 17] },
            '天安门广场': { base: 9, peak: [9, 10, 14, 15], low: [7, 8, 17, 18] },
            '颐和园': { base: 6, peak: [10, 11, 14, 15], low: [8, 9, 16, 17] },
            '天坛': { base: 5, peak: [9, 10, 14, 15], low: [8, 16, 17] },
            '长城': { base: 7, peak: [10, 11, 12, 14], low: [8, 9, 16, 17] },
            '鸟巢': { base: 6, peak: [14, 15, 19, 20], low: [9, 10, 16, 17] },
            '水立方': { base: 5, peak: [14, 15, 19, 20], low: [9, 10, 16, 17] }
        };

        // 获取景点基础数据，如果没有则使用默认值
        const attractionData = baseCrowdData[attractionName] || { base: 6, peak: [10, 14], low: [9, 16] };
        let crowdLevel = attractionData.base;

        // 时间段调整
        const hour = parseInt(timeSlot);
        if (attractionData.peak.includes(hour)) {
            crowdLevel += 2;
        } else if (attractionData.low.includes(hour)) {
            crowdLevel -= 2;
        }

        // 季节调整
        if (season === 'summer' || season === 'spring') {
            crowdLevel += 1;
        } else if (season === 'winter') {
            crowdLevel -= 1;
        }

        // 天气调整
        if (weather && weather.includes('雨')) {
            crowdLevel -= 2;
        } else if (weather && weather.includes('晴')) {
            crowdLevel += 1;
        }

        // 周末调整（简化处理）
        const today = new Date();
        if (today.getDay() === 0 || today.getDay() === 6) {
            crowdLevel += 2;
        }

        return Math.max(1, Math.min(10, crowdLevel));
    };

    // 获取当前季节
    const getCurrentSeason = () => {
        const month = new Date().getMonth() + 1;
        if (month >= 3 && month <= 5) return 'spring';
        if (month >= 6 && month <= 8) return 'summer';
        if (month >= 9 && month <= 11) return 'autumn';
        return 'winter';
    };

    const currentSeason = getCurrentSeason();
    const currentWeather = weatherInfo?.current?.weather || '晴';

    // 分析每个景点的人流量情况
    attractions.forEach(attraction => {
        const attractionName = typeof attraction === 'string' ? attraction : attraction.name;
        const attractionAnalysis = {
            name: attractionName,
            crowdLevels: {},
            optimalTimes: [],
            avoidTimes: [],
            tips: []
        };

        // 分析一天中不同时段的人流量
        for (let hour = 8; hour <= 18; hour++) {
            const crowdLevel = getCrowdLevel(attractionName, hour, currentSeason, currentWeather);
            attractionAnalysis.crowdLevels[hour] = crowdLevel;

            if (crowdLevel <= 4) {
                attractionAnalysis.optimalTimes.push(`${hour}:00`);
            } else if (crowdLevel >= 8) {
                attractionAnalysis.avoidTimes.push(`${hour}:00`);
            }
        }

        // 生成个性化建议
        if (userPreferences?.crowdPreference === '避开人群') {
            attractionAnalysis.tips.push('建议选择早晨8-9点或下午4-5点游览，人流量相对较少');
        } else if (userPreferences?.crowdPreference === '不介意人多') {
            attractionAnalysis.tips.push('可以选择任意时间游览，热门时段氛围更佳');
        }

        // 天气相关建议
        if (currentWeather.includes('雨')) {
            attractionAnalysis.tips.push('雨天游客较少，是避开人群的好时机');
        } else if (currentWeather.includes('晴')) {
            attractionAnalysis.tips.push('晴天游客较多，建议提前规划路线');
        }

        crowdAnalysis.attractions.push(attractionAnalysis);
    });

    // 生成总体推荐
    crowdAnalysis.recommendations = [
        '早晨8-9点：大部分景点人流量最少，适合拍照和深度游览',
        '上午10-11点：热门景点开始拥挤，建议游览小众景点',
        '中午12-13点：用餐时间，景点人流量有所减少',
        '下午14-15点：一天中最拥挤的时段，建议室内景点或休息',
        '下午16-17点：人流量开始减少，是第二个最佳游览时段',
        '傍晚18点后：大部分景点关闭，可选择夜景景点'
    ];

    // 根据用户偏好调整推荐
    if (userPreferences?.crowdPreference === '避开人群') {
        crowdAnalysis.recommendations.unshift('💡 根据您的偏好，强烈建议选择早晨和傍晚时段游览');
    }

    return crowdAnalysis;
}

/**
 * 综合决策分析功能
 * @param {Object} plan - 旅游计划
 * @param {Object} weatherInfo - 天气信息
 * @param {Object} crowdAnalysis - 人流量分析结果
 * @param {Object} userPreferences - 用户偏好设置
 * @returns {Object} 综合决策分析结果
 */
function generateComprehensiveAnalysis(plan, weatherInfo, crowdAnalysis, userPreferences) {
    const analysis = {
        pros: [],
        cons: [],
        risks: [],
        recommendations: [],
        score: 0
    };

    // 基础评分
    let score = 70;

    // 天气因素分析
    if (weatherInfo && weatherInfo.current) {
        const weather = weatherInfo.current.weather;
        if (weather.includes('晴')) {
            analysis.pros.push('☀️ 天气晴朗，适合户外游览和拍照');
            score += 10;
        } else if (weather.includes('雨')) {
            analysis.cons.push('🌧️ 雨天可能影响户外活动体验');
            analysis.risks.push('部分户外景点可能关闭或体验受限');
            score -= 15;
        } else if (weather.includes('雪')) {
            analysis.pros.push('❄️ 雪景独特，冬季旅游体验佳');
            analysis.cons.push('❄️ 寒冷天气，需要做好保暖准备');
            score -= 5;
        }

        // 温度分析
        const temp = weatherInfo.current.temperature;
        if (temp >= 20 && temp <= 28) {
            analysis.pros.push('🌡️ 温度适宜，舒适度高');
            score += 5;
        } else if (temp > 35) {
            analysis.cons.push('🔥 高温天气，需要注意防暑降温');
            analysis.risks.push('中暑风险，建议避开中午时段');
            score -= 10;
        } else if (temp < 0) {
            analysis.cons.push('🧊 严寒天气，户外活动受限');
            analysis.risks.push('冻伤风险，需要充分保暖');
            score -= 10;
        }
    }

    // 人流量因素分析
    if (crowdAnalysis && crowdAnalysis.attractions) {
        const avgCrowdLevel = crowdAnalysis.attractions.reduce((sum, attr) => {
            const levels = Object.values(attr.crowdLevels);
            return sum + (levels.reduce((a, b) => a + b, 0) / levels.length);
        }, 0) / crowdAnalysis.attractions.length;

        if (avgCrowdLevel <= 4) {
            analysis.pros.push('👥 人流量适中，游览体验较好');
            score += 10;
        } else if (avgCrowdLevel >= 7) {
            analysis.cons.push('👥 人流量较大，可能需要排队等候');
            analysis.risks.push('拥挤风险，建议提前规划路线');
            score -= 10;
        }
    }

    // 行程安排分析
    if (plan && Array.isArray(plan.itinerary)) {
        const daysCount = plan.itinerary.length;
        console.log('🔎 [analysis] 行程天数:', daysCount);

        let totalItems = 0;
        plan.itinerary.forEach((day, idx) => {
            const hasAttractions = Array.isArray(day.attractions);
            const hasActivities = Array.isArray(day.activities);
            const items = hasAttractions ? day.attractions : (hasActivities ? day.activities : []);
            if (!hasAttractions && hasActivities) {
                console.warn(`⚠️ [analysis] 第${idx + 1}天缺少 attractions，使用 activities 代替，长度: ${items.length}`);
            } else if (!hasAttractions && !hasActivities) {
                console.warn(`⚠️ [analysis] 第${idx + 1}天既无 attractions 也无 activities，默认0`);
            } else {
                console.log(`✅ [analysis] 第${idx + 1}天项目数: ${items.length}`);
            }
            totalItems += items.length;
        });

        const avgItemsPerDay = daysCount ? (totalItems / daysCount) : 0;

        if (avgItemsPerDay <= 3) {
            analysis.pros.push('⏰ 行程安排轻松，有充足时间深度游览');
            score += 5;
        } else if (avgItemsPerDay >= 5) {
            analysis.cons.push('⏰ 行程较紧凑，可能比较疲劳');
            analysis.risks.push('时间紧张，建议预留缓冲时间');
            score -= 5;
        }
    } else {
        console.warn('⚠️ [analysis] 行程不存在或不是数组:', plan ? plan.itinerary : plan);
    }
    // removed unsafe duplicate block

    // 用户偏好匹配分析
    if (userPreferences) {
        // 交通方式分析
        if (userPreferences.transportPreference && userPreferences.transportPreference.includes('步行')) {
            analysis.pros.push('🚶 步行游览，环保健康，体验更深入');
            if (weatherInfo && weatherInfo.current.weather.includes('雨')) {
                analysis.cons.push('🚶 雨天步行不便，建议准备雨具');
            }
        }

        // 人流量偏好匹配
        if (userPreferences.crowdPreference === '避开高峰') {
            analysis.recommendations.push('建议选择早晨8-9点或下午4-5点游览');
        }

        // 特殊需求考虑
        if (userPreferences.specialRequirements) {
            analysis.pros.push('🎯 已考虑您的特殊需求，行程更贴合个人喜好');
            score += 5;
        }
    }

    // 季节性分析
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) {
        analysis.pros.push('🌸 春季出行，万物复苏，景色宜人');
        score += 5;
    } else if (month >= 6 && month <= 8) {
        analysis.pros.push('☀️ 夏季出行，活动丰富，体验多样');
        if (month === 7 || month === 8) {
            analysis.cons.push('🔥 暑期高峰，景点人流量大，价格较高');
            score -= 5;
        }
    } else if (month >= 9 && month <= 11) {
        analysis.pros.push('🍂 秋季出行，天高气爽，是旅游黄金季节');
        score += 8;
    } else {
        analysis.pros.push('❄️ 冬季出行，淡季价格，人少景美');
        analysis.cons.push('❄️ 部分景点可能关闭或开放时间缩短');
    }

    // 综合风险评估
    if (score < 60) {
        analysis.risks.push('⚠️ 综合条件一般，建议考虑调整出行时间');
    }

    // 生成个性化建议
    analysis.recommendations.push('💡 建议提前查看景点开放时间和门票信息');
    analysis.recommendations.push('📱 推荐下载景点官方APP，获取实时信息');
    
    if (weatherInfo && weatherInfo.current.weather.includes('雨')) {
        analysis.recommendations.push('☂️ 雨天出行，建议准备雨具和防滑鞋');
    }

    // 最终评分
    analysis.score = Math.max(0, Math.min(100, score));

    return analysis;
}