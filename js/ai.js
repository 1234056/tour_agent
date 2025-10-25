/**
 * AI 相关功能模块
 * 包含所有与 AI API 交互和智能推荐相关的功能
 */

// AI API调用函数 - 使用SiliconFlow API
async function callAIAPI(userInput) {
    // 请在这里替换为你的SiliconFlow API Key
    const API_KEY = 'sk-mmqeogjnhvbcjocksjpyspuwkwnprzqmknifqmzurjxostvf'; // 请替换为实际的API Key
    
    // 如果有自定义提示词，使用自定义提示词，否则使用默认提示词
    const prompt = userInput.customPrompt || `请为用户规划一个${userInput.destination}的${userInput.days}天旅游方案，预算${userInput.budget}，兴趣偏好：${userInput.interests.join('、')}。

请返回JSON格式的详细行程安排，格式如下：
{
    "destination": "${userInput.destination}",
    "days": ${userInput.days},
    "budget": "${userInput.budget}",
    "itinerary": [
        {
            "day": 1,
            "activities": ["活动1", "活动2"],
            "meals": ["早餐地点", "午餐地点", "晚餐地点"],
            "accommodation": "酒店名称"
        }
    ],
    "recommendations": {
        "transport": "交通建议",
        "tips": "旅游贴士"
    }
}`;
    
    try {
        console.log('正在调用SiliconFlow API...');
        
        const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer sk-mmqeogjnhvbcjocksjpyspuwkwnprzqmknifqmzurjxostvf`
            },
            body: JSON.stringify({
                model: "Qwen/Qwen2.5-7B-Instruct", // 使用SiliconFlow支持的模型
                messages: [
                    {
                        role: "system",
                        content: "你是一个专业的旅游规划师，请根据用户需求制定详细的旅游方案。请严格按照要求的JSON格式返回结果。"
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 2000,
                temperature: 0.7,
                stream: false
            })
        });
        
        console.log('API响应状态:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API错误响应:', errorText);
            throw new Error(`API请求失败: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('API响应数据:', data);
        
        // 安全检查API响应格式
        if (!data || !data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
            console.error('API响应格式错误:', data);
            throw new Error('API响应格式不正确：缺少choices数组');
        }
        
        if (!data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
            console.error('API响应消息格式错误:', data.choices[0]);
            throw new Error('API响应格式不正确：缺少message内容');
        }
        
        console.log('AI响应内容:', data.choices[0].message.content);
        return data.choices[0].message.content;
        
    } catch (error) {
        console.error('AI API调用详细错误:', error);
        console.error('错误堆栈:', error.stack);
        throw error; // 重新抛出错误，让上层处理
    }
}

// 生成景点推荐
async function generateAttractionRecommendations(destination, days, budget, interests, userPreferences = {}) {
    try {
        const attractionCount = Math.min(days * 3, 15);
        
        // 构建增强的提示词，包含天气和个性化信息
        let weatherContext = '';
        if (userPreferences.weatherInfo && userPreferences.weatherInfo.current) {
            const weather = userPreferences.weatherInfo.current;
            weatherContext = `
**当前天气信息：**
- 天气状况：${weather.weather}
- 温度：${weather.temperature}°C
- 湿度：${weather.humidity}%
- 风力：${weather.winddirection} ${weather.windpower}`;
            
            if (userPreferences.weatherInfo.forecast && userPreferences.weatherInfo.forecast.length > 0) {
                const forecast = userPreferences.weatherInfo.forecast[0];
                weatherContext += `
- 预报：${forecast.dayweather}，${forecast.daytemp}°C/${forecast.nighttemp}°C`;
            }
        }
        
        let personalizedContext = '';
        if (userPreferences.travelDate) {
            personalizedContext += `\n- 出行日期：${userPreferences.travelDate}`;
        }
        if (userPreferences.departureCity) {
            personalizedContext += `\n- 出发城市：${userPreferences.departureCity}`;
        }
        if (userPreferences.timePreference) {
            personalizedContext += `\n- 游玩时间偏好：${userPreferences.timePreference}`;
        }
        if (userPreferences.transportPreference && userPreferences.transportPreference.length > 0) {
            personalizedContext += `\n- 出行方式偏好：${userPreferences.transportPreference.join('、')}`;
        }
        if (userPreferences.crowdPreference) {
            personalizedContext += `\n- 人流量偏好：${userPreferences.crowdPreference}`;
        }
        if (userPreferences.weatherAdaptability && userPreferences.weatherAdaptability.length > 0) {
            personalizedContext += `\n- 天气适应性：${userPreferences.weatherAdaptability.join('、')}`;
        }
        if (userPreferences.luggage && userPreferences.luggage.length > 0) {
            personalizedContext += `\n- 携带物品：${userPreferences.luggage.join('、')}`;
        }
        if (userPreferences.specialRequirements) {
            personalizedContext += `\n- 特殊需求：${userPreferences.specialRequirements}`;
        }
        
        const prompt = `你是一个专业的旅游规划师，请为${destination}推荐适合${days}天旅游的优质景点。

**用户需求分析：**
- 目的地：${destination}
- 旅游天数：${days}天
- 预算范围：${budget}
- 兴趣偏好：${interests.join('、')}${personalizedContext}
${weatherContext}

**智能推荐要求：**
1. 推荐${attractionCount}个景点，涵盖不同类型和区域
2. 考虑景点的知名度、游览价值和用户兴趣匹配度
3. 包含必游景点和特色小众景点的合理搭配
4. 考虑景点的地理分布，便于后续路线优化
5. 根据预算选择合适档次的景点（免费、低价、中高价）
6. **重要：根据天气情况推荐合适的景点类型**
   - 晴天：优先推荐户外景点、公园、观景台
   - 雨天：优先推荐室内景点、博物馆、购物中心
   - 高温：推荐有遮阴或空调的场所
   - 低温：推荐室内景点或有保暖设施的场所
7. **考虑用户偏好：**
   - 根据人流量偏好选择热门或小众景点
   - 根据出行方式偏好选择交通便利的景点
   - 根据时间偏好安排适合的景点类型
   - 考虑携带物品的便利性

**景点类型建议：**
- 历史文化类：古迹、博物馆、文化街区
- 自然风光类：公园、湖泊、山景、海景
- 现代都市类：地标建筑、购物区、观景台
- 休闲娱乐类：主题公园、特色街区、夜市
- 美食体验类：美食街、特色餐厅聚集区
- 室内场所：博物馆、艺术馆、购物中心、展览馆
- 户外场所：公园、广场、海滩、山景区

**输出格式：**
请严格按照以下格式返回，每行一个景点名称，不要添加任何编号、符号或额外说明：

景点名称1
景点名称2
景点名称3
...

确保景点名称准确、简洁，便于地图搜索。`;

        console.log('🤖 发送景点推荐请求到AI...');
        const aiResponse = await callAIAPI({
            destination,
            days,
            budget,
            interests,
            customPrompt: prompt
        });
        
        // 解析AI返回的景点列表
        const attractions = aiResponse.split('\n')
            .map(line => line.trim())
            .filter(line => line && 
                    !line.includes('：') && 
                    !line.includes('推荐') && 
                    !line.includes('景点') && 
                    !line.includes('建议') &&
                    !line.match(/^\d+\./) && // 过滤数字编号
                    !line.includes('```') &&
                    line.length > 1 && 
                    line.length < 20) // 合理的景点名称长度
            .slice(0, attractionCount);
            
        console.log('✅ AI推荐景点:', attractions);
        
        // 验证推荐结果
        if (attractions.length < Math.min(days * 2, 6)) {
            throw new Error(`AI推荐景点数量不足，仅获得${attractions.length}个景点，需要至少${Math.min(days * 2, 6)}个`);
        }
        
        return attractions;
        
    } catch (error) {
        console.error('AI景点推荐失败:', error);
        throw new Error(`AI景点推荐失败: ${error.message}`);
    }
}

// AI行程优化
async function optimizeItineraryWithGeoData(destination, days, budget, interests, attractionsWithGeoData, distanceMatrix, weatherInfo, userPreferences) {
    try {
        // 构建地理数据摘要
        const geoDataSummary = buildGeoDataSummary(attractionsWithGeoData, distanceMatrix);
        
        // 构建天气信息摘要
        let weatherSummary = '';
        if (weatherInfo) {
            weatherSummary = `
**天气信息：**
- 当前天气：${weatherInfo.current ? `${weatherInfo.current.weather} ${weatherInfo.current.temperature}°C` : '未知'}
- 湿度：${weatherInfo.current ? weatherInfo.current.humidity + '%' : '未知'}
- 风力：${weatherInfo.current ? `${weatherInfo.current.winddirection} ${weatherInfo.current.windpower}级` : '未知'}`;
            
            if (weatherInfo.forecast && weatherInfo.forecast.length > 0) {
                weatherSummary += `
- 未来天气：${weatherInfo.forecast.slice(0, 3).map(day => 
                    `${day.date} ${day.dayweather} ${day.nighttemp}°C~${day.daytemp}°C`
                ).join('，')}`;
            }
        }

        // 构建用户偏好摘要
        let preferencesSummary = '';
        if (userPreferences) {
            preferencesSummary = `
**个性化偏好：**
- 出行日期：${userPreferences.travelDate || '未指定'}
- 出发城市：${userPreferences.departureCity || '未指定'}
- 游玩时间偏好：${userPreferences.timePreference || '未指定'}
- 出行方式偏好：${userPreferences.transportPreference || '未指定'}
- 人流量偏好：${userPreferences.crowdPreference || '未指定'}
- 天气适应性：${userPreferences.weatherAdaptability || '未指定'}
- 携带物品：${userPreferences.luggage || '未指定'}
- 特殊需求：${userPreferences.specialRequests || '无'}`;
        }

        // 构建优化提示词
        const optimizationPrompt = `你是一个专业的旅游路线规划师。请根据以下真实的地理数据、天气信息和用户偏好，为${destination}制定${days}天的最优旅游路线。

**景点信息：**
${attractionsWithGeoData.map((attraction, index) => 
    `${index + 1}. ${attraction.name} (${attraction.address || ''})`
).join('\n')}

**距离和交通信息：**
${geoDataSummary}
${weatherSummary}
${preferencesSummary}

**用户需求：**
- 目的地：${destination}
- 天数：${days}天
- 预算：${budget}
- 兴趣偏好：${interests.join('、')}

**优化原则：**
1. 最小化每天的总交通时间
2. 相邻景点尽量在同一区域
3. 考虑景点的开放时间和游览时长
4. 每天安排3-4个景点，避免过度疲劳
5. 优先安排步行可达的景点组合
6. 根据天气情况调整室内外景点安排（雨天优先室内景点）
7. 考虑用户的时间偏好和出行方式偏好
8. 根据人流量偏好安排热门/冷门景点的游览时间
9. 结合用户的特殊需求和携带物品情况
10. 考虑天气适应性，为极端天气提供备选方案

请返回JSON格式的行程安排：
{
  "destination": "${destination}",
  "days": ${days},
  "overview": {
    "totalDays": ${days},
    "estimatedCost": "根据预算估算",
    "attractions": "景点总数",
    "hotels": ["推荐酒店1", "推荐酒店2"]
  },
  "itinerary": [
    {
      "day": 1,
      "theme": "第一天主题",
      "activities": [
        {
          "time": "09:00",
          "name": "景点名称",
          "type": "attraction",
          "description": "活动描述",
          "duration": "游览时长",
          "transport": "到达方式",
          "travelTime": "交通时间"
        }
      ]
    }
  ],
  "recommendations": {
    "hotels": ["酒店推荐"],
    "food": ["美食推荐"],
    "transport": "交通建议",
    "tips": "旅游贴士"
  }
}

请确保返回的是有效的JSON格式，不要包含其他文字说明。`;

        console.log('🧠 发送优化请求到AI...');
        const aiResponse = await callAIAPI({
            destination,
            days,
            budget,
            interests,
            customPrompt: optimizationPrompt
        });

        // 解析AI优化后的响应
        const optimizedPlan = parseOptimizedAIResponse(aiResponse, destination, days, budget, interests, attractionsWithGeoData, distanceMatrix);
        
        console.log('✅ AI行程优化完成:', optimizedPlan);
        return optimizedPlan;

    } catch (error) {
        console.error('AI行程优化失败:', error);
        throw new Error(`AI行程优化失败: ${error.message}`);
    }
}

// 解析AI优化后的响应
function parseOptimizedAIResponse(aiResponse, destination, days, budget, interests, attractionsWithGeoData, distanceMatrix) {
    try {
        console.log('🔍 开始解析AI优化响应...');
        if (aiResponse == null) {
            console.error('❌ AI响应为空或未定义');
            throw new Error('AI响应为空或未定义');
        }
        if (typeof aiResponse !== 'string') {
            console.warn('⚠️ AI响应不是字符串，类型:', typeof aiResponse);
            try {
                aiResponse = JSON.stringify(aiResponse);
                console.log('ℹ️ 已将AI响应序列化为字符串');
            } catch (stringifyErr) {
                console.error('❌ 无法序列化AI响应:', stringifyErr);
                throw new Error('AI响应格式不正确，无法解析');
            }
        }

        console.log('原始AI响应长度:', aiResponse.length);
        console.log('原始AI响应前500字符:', aiResponse.substring(0, 500));
        
        // 清理响应内容，移除markdown代码块标记
        let cleanResponse = aiResponse.replace(/```json\s*|\s*```/g, '').trim();
        
        // 尝试提取JSON部分
        const jsonStart = cleanResponse.indexOf('{');
        const jsonEnd = cleanResponse.lastIndexOf('}');
        
        if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
            console.error('❌ 无法找到有效的JSON结构');
            throw new Error('AI响应中未找到有效的JSON结构');
        }
        
        cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1);
        console.log('清理后的JSON:', cleanResponse.substring(0, 200) + '...');
        
        const aiPlan = JSON.parse(cleanResponse);
        console.log('✅ JSON解析成功');
        
        // 验证AI返回的数据结构
        if (!aiPlan || typeof aiPlan !== 'object') {
            throw new Error('AI响应不是有效的对象');
        }
        
        if (!aiPlan.itinerary || !Array.isArray(aiPlan.itinerary)) {
            console.error('❌ itinerary字段无效:', aiPlan.itinerary);
            throw new Error('AI响应结构不完整，缺少有效的itinerary数组');
        }
        
        console.log(`✅ 验证通过，包含${aiPlan.itinerary.length}天行程`);
        
        // 增强AI返回的数据，添加实际的交通信息
        aiPlan.itinerary.forEach((dayPlan, dayIndex) => {
            console.log(`处理第${dayIndex + 1}天行程...`);
            if (dayPlan.activities && Array.isArray(dayPlan.activities)) {
                for (let i = 0; i < dayPlan.activities.length - 1; i++) {
                    const currentActivity = dayPlan.activities[i];
                    const nextActivity = dayPlan.activities[i + 1];
                    
                    if (currentActivity && nextActivity && 
                        currentActivity.type === 'attraction' && 
                        nextActivity.type === 'attraction' &&
                        currentActivity.name && nextActivity.name) {
                        
                        const distanceInfo = distanceMatrix[currentActivity.name] && 
                                           distanceMatrix[currentActivity.name][nextActivity.name];
                        
                        if (distanceInfo) {
                            nextActivity.transport = getTransportDescription(distanceInfo.transportMode);
                            nextActivity.travelTime = `${Math.round(distanceInfo.duration / 60)}分钟`;
                            console.log(`添加交通信息: ${currentActivity.name} -> ${nextActivity.name}`);
                        }
                    }
                }
            }
        });
        
        console.log('✅ AI优化响应解析完成');
        return aiPlan;
    } catch (error) {
        console.error('❌ AI响应解析失败:', error);
        console.error('错误详情:', error.message);
        console.error('错误堆栈:', error.stack);
        throw new Error(`AI优化行程解析失败: ${error.message}`);
    }
}

// 构建地理数据摘要
function buildGeoDataSummary(attractionsWithGeoData, distanceMatrix) {
    let summary = '';
    
    for (let i = 0; i < attractionsWithGeoData.length; i++) {
        const fromAttraction = attractionsWithGeoData[i];
        const nearbyAttractions = [];
        
        for (let j = 0; j < attractionsWithGeoData.length; j++) {
            if (i !== j) {
                const toAttraction = attractionsWithGeoData[j];
                const distanceInfo = distanceMatrix[fromAttraction.name][toAttraction.name];
                
                if (distanceInfo && distanceInfo.duration <= 1800) { // 30分钟内
                    const transportText = distanceInfo.transportMode === 'walking' ? '步行' : 
                                        distanceInfo.transportMode === 'driving' ? '驾车' : '公交';
                    nearbyAttractions.push(
                        `${toAttraction.name}(${transportText}${Math.round(distanceInfo.duration/60)}分钟)`
                    );
                }
            }
        }
        
        if (nearbyAttractions.length > 0) {
            summary += `${fromAttraction.name} 附近30分钟内可达: ${nearbyAttractions.join(', ')}\n`;
        }
    }
    
    return summary;
}

// 获取交通方式描述
function getTransportDescription(transportMode) {
    switch (transportMode) {
        case 'walking': return '步行';
        case 'driving': return '驾车/打车';
        case 'public': return '公共交通';
        default: return '步行';
    }
}