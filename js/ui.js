// UI 展示模块：包含方案概览、行程、推荐、交通信息、天气、人流量、综合分析等渲染函数

// 显示方案概览
function displayPlanOverview(plan) {
    // 首先检查DOM元素是否存在
    const planOverviewElement = document.getElementById('planOverview');
    if (!planOverviewElement) {
        console.error('planOverview DOM元素未找到');
        return;
    }
    
    // 安全检查：确保plan存在
    if (!plan) {
        console.error('计划数据不存在，无法显示概览');
        planOverviewElement.innerHTML = `
            <h3>🎯 旅游方案概览</h3>
            <div class="error-message">数据加载失败，请重试</div>
        `;
        return;
    }
    
    // 使用默认值防止undefined错误，支持多种数据结构
    const overview = plan.overview || {};
    const totalDays = overview.totalDays || plan.days || '未知';
    const estimatedCost = overview.estimatedCost || plan.estimatedCost || '待计算';
    const attractions = overview.attractions || (plan.itinerary ? plan.itinerary.length : '多个');
    const hotels = overview.hotels || '多个';
    const destination = plan.destination || '目的地';
    const days = plan.days || '';
    
    try {
        const overviewHtml = `
            <h3>🎯 ${destination}${days}日游方案</h3>
            <div class="overview-grid">
                <div class="overview-item">
                    <span class="number">${totalDays}</span>
                    <span class="label">游玩天数</span>
                </div>
                <div class="overview-item">
                    <span class="number">${estimatedCost}</span>
                    <span class="label">预估费用(元)</span>
                </div>
                <div class="overview-item">
                    <span class="number">${attractions}</span>
                    <span class="label">推荐景点</span>
                </div>
                <div class="overview-item">
                    <span class="number">${hotels}</span>
                    <span class="label">酒店推荐</span>
                </div>
            </div>
        `;
        
        planOverviewElement.innerHTML = overviewHtml;
        console.log('✅ 旅游方案概览显示成功');
        
    } catch (error) {
        console.error('显示旅游方案概览时出错:', error);
        planOverviewElement.innerHTML = `
            <h3>🎯 旅游方案概览</h3>
            <div class="error-message">显示出错，请重试</div>
        `;
    }
}

// 显示详细行程
function displayItinerary(itinerary) {
    let itineraryHtml = '<h3>📅 详细行程安排</h3>';
    
    // 安全检查：确保itinerary存在且是数组
    if (!itinerary || !Array.isArray(itinerary) || itinerary.length === 0) {
        itineraryHtml += '<div class="error-message">行程数据加载失败，请重试</div>';
        document.getElementById('itinerary').innerHTML = itineraryHtml;
        return;
    }
    
    itinerary.forEach(dayPlan => {
        // 安全检查：确保dayPlan存在且有必要的属性
        if (!dayPlan || !dayPlan.day) {
            return; // 跳过无效的日程
        }
        
        itineraryHtml += `
            <div class="day-plan">
                <div class="day-title">第${dayPlan.day}天</div>
        `;
        
        // 安全检查：确保activities存在且是数组
        if (dayPlan.activities && Array.isArray(dayPlan.activities)) {
            dayPlan.activities.forEach(activity => {
                // 安全检查：确保activity有必要的属性
                if (!activity) return;
                
                const time = activity.time || '全天';
                const title = activity.name || '活动';
                const description = activity.description || '详情待定';
                
                itineraryHtml += `
                    <div class="activity">
                        <div class="activity-time">${time}</div>
                        <div class="activity-content">
                            <div class="activity-title">${title}</div>
                            <div class="activity-description">${description}</div>
                        </div>
                    </div>
                `;
            });
        } else {
            itineraryHtml += `
                <div class="activity">
                    <div class="activity-content">
                        <div class="activity-title">暂无具体安排</div>
                        <div class="activity-description">请稍后查看详细行程</div>
                    </div>
                </div>
            `;
        }
        
        itineraryHtml += '</div>';
    });
    
    document.getElementById('itinerary').innerHTML = itineraryHtml;
}

// 显示推荐信息
function displayRecommendations(recommendations) {
    const recommendationsHtml = `
        <h3>💡 贴心推荐</h3>
        <div class="recommendation-grid">
            <div class="recommendation-card">
                <h4>🏨 推荐酒店</h4>
                ${recommendations.hotels.map(hotel => `<div class="recommendation-item">${hotel}</div>`).join('')}
            </div>
            <div class="recommendation-card">
                <h4>🍜 特色美食</h4>
                ${recommendations.food.map(food => `<div class="recommendation-item">${food}</div>`).join('')}
            </div>
            <div class="recommendation-card">
                <h4>🚌 交通方式</h4>
                <div class="recommendation-item">${recommendations.transport}</div>
            </div>
            <div class="recommendation-card">
                <h4>💡 旅行贴士</h4>
                <div class="recommendation-item">${recommendations.tips}</div>
            </div>
        </div>
    `;
    
    document.getElementById('recommendations').innerHTML = recommendationsHtml;
}

// 显示交通信息详情
function displayTransportInfo(transportDetails) {
    const recommendationsElement = document.getElementById('recommendations');
    if (recommendationsElement && transportDetails) {
        // 在推荐信息后添加交通信息
        const transportSection = document.createElement('div');
        transportSection.className = 'transport-info-section';
        transportSection.innerHTML = transportDetails;
        recommendationsElement.appendChild(transportSection);
    }
}

// 显示天气信息
function displayWeatherInfo(weatherInfo) {
    const weatherContainer = document.getElementById('weatherInfo');
    if (!weatherInfo || !weatherContainer) {
        return;
    }

    // 获取天气图标
    function getWeatherIcon(weather) {
        const iconMap = {
            '晴': '☀️',
            '多云': '⛅',
            '阴': '☁️',
            '小雨': '🌦️',
            '中雨': '🌧️',
            '大雨': '⛈️',
            '雪': '❄️',
            '雾': '🌫️',
            '霾': '😷'
        };
        
        for (const key in iconMap) {
            if (weather && weather.includes(key)) {
                return iconMap[key];
            }
        }
        return '🌤️'; // 默认图标
    }

    // 生成出行建议
    function generateTravelTips(current, forecast) {
        const tips = [];
        
        if (current) {
            const temp = parseInt(current.temperature);
            const weather = current.weather;
            
            // 温度建议
            if (temp < 5) {
                tips.push('气温较低，建议穿着厚外套和保暖衣物');
            } else if (temp < 15) {
                tips.push('气温偏凉，建议穿着长袖和外套');
            } else if (temp > 30) {
                tips.push('气温较高，建议穿着轻薄透气的衣物');
            }
            
            // 天气建议
            if (weather && weather.includes('雨')) {
                tips.push('有降雨，请携带雨具，注意防滑');
            }
            if (weather && weather.includes('雪')) {
                tips.push('有降雪，注意保暖和路面安全');
            }
            if (weather && (weather.includes('雾') || weather.includes('霾'))) {
                tips.push('能见度较低，出行请注意安全');
            }
            
            // 湿度建议
            if (current.humidity && parseInt(current.humidity) > 80) {
                tips.push('湿度较高，体感可能较为闷热');
            }
            
            // 风力建议
            if (current.windpower && parseInt(current.windpower) > 6) {
                tips.push('风力较大，户外活动请注意安全');
            }
        }
        
        if (tips.length === 0) {
            tips.push('天气条件良好，适合出行游玩');
        }
        
        return tips;
    }

    let html = `
        <h3>
            🌤️ 天气信息
        </h3>
    `;

    // 显示当前天气
    if (weatherInfo.current) {
        const current = weatherInfo.current;
        html += `
            <div class="weather-current">
                <div class="weather-item">
                    <span class="weather-icon">${getWeatherIcon(current.weather)}</span>
                    <div class="weather-value">${current.weather || '未知'}</div>
                    <div class="weather-label">天气状况</div>
                </div>
                <div class="weather-item">
                    <span class="weather-icon">🌡️</span>
                    <div class="weather-value">${current.temperature || current.temp || '--'}°C</div>
                    <div class="weather-label">当前温度</div>
                </div>
                <div class="weather-item">
                    <span class="weather-icon">💧</span>
                    <div class="weather-value">${current.humidity || '--'}%</div>
                    <div class="weather-label">相对湿度</div>
                </div>
                <div class="weather-item">
                    <span class="weather-icon">💨</span>
                    <div class="weather-value">${(current.winddirection || current.windDirection || '--')} ${(current.windpower || current.windPower || '--')}级</div>
                    <div class="weather-label">风向风力</div>
                </div>
            </div>
        `;
    }

    // 显示天气预报
    if (weatherInfo.forecast && weatherInfo.forecast.length > 0) {
        html += `
            <div class="weather-forecast">
                <h4>📅 未来天气预报</h4>
        `;
        
        weatherInfo.forecast.slice(0, 4).forEach(day => {
            html += `
                <div class="forecast-item">
                    <div class="forecast-date">${day.date}</div>
                    <div class="forecast-weather">
                        <span>${getWeatherIcon(day.dayweather)}</span>
                        <span>${day.dayweather}</span>
                        <span class="forecast-temp">${day.nighttemp}°C ~ ${day.daytemp}°C</span>
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
    }

    // 显示出行建议
    const tips = generateTravelTips(weatherInfo.current, weatherInfo.forecast);
    if (tips.length > 0) {
        html += `
            <div class="weather-tips">
                <h4>💡 出行建议</h4>
                <ul>
                    ${tips.map(tip => `<li>${tip}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    weatherContainer.innerHTML = html;
    weatherContainer.style.display = 'block';
}

// 显示人流量分析结果
function displayCrowdAnalysis(crowdAnalysis) {
    if (!crowdAnalysis) return;

    const crowdContainer = document.getElementById('crowdAnalysis');
    if (!crowdContainer) return;

    let html = `
        <h4>👥 人流量分析与最佳游览时间</h4>
        
        <div class="crowd-recommendations">
            <h5>⏰ 时段建议</h5>
            <ul>
                ${crowdAnalysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
    `;

    if (crowdAnalysis.attractions.length > 0) {
        html += `
            <div class="attraction-crowd-details">
                <h5>🎯 景点详细分析</h5>
        `;

        crowdAnalysis.attractions.forEach(attraction => {
            const optimalTimesText = attraction.optimalTimes.length > 0 
                ? attraction.optimalTimes.join('、') 
                : '全天人流量较大';
            
            const avoidTimesText = attraction.avoidTimes.length > 0 
                ? attraction.avoidTimes.join('、') 
                : '无特别拥挤时段';

            html += `
                <div class="attraction-crowd-item">
                    <h6>${attraction.name}</h6>
                    <div class="crowd-info">
                        <span class="optimal-time">✅ 最佳时间：${optimalTimesText}</span>
                        <span class="avoid-time">⚠️ 避开时间：${avoidTimesText}</span>
                    </div>
                    ${attraction.tips.length > 0 ? `
                        <div class="crowd-tips">
                            ${attraction.tips.map(tip => `<small>💡 ${tip}</small>`).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        });

        html += `</div>`;
    }

    crowdContainer.innerHTML = html;
    crowdContainer.style.display = 'block';
}

// 显示综合决策分析
function displayComprehensiveAnalysis(analysis) {
    if (!analysis) return;

    const analysisContainer = document.getElementById('comprehensiveAnalysis');
    if (!analysisContainer) return;

    // 评分颜色
    let scoreColor = '#4CAF50'; // 绿色
    let scoreText = '优秀';
    if (analysis.score < 60) {
        scoreColor = '#f44336'; // 红色
        scoreText = '需要注意';
    } else if (analysis.score < 80) {
        scoreColor = '#ff9800'; // 橙色
        scoreText = '良好';
    }

    let html = `
        <h4>📊 综合决策分析</h4>
        
        <div class="analysis-score">
            <div class="score-circle" style="border-color: ${scoreColor};">
                <span class="score-number" style="color: ${scoreColor};">${analysis.score}</span>
                <span class="score-label">${scoreText}</span>
            </div>
        </div>
    `;

    // 优势分析
    if (analysis.pros.length > 0) {
        html += `
            <div class="analysis-section pros-section">
                <h5>✅ 方案优势</h5>
                <ul>
                    ${analysis.pros.map(pro => `<li>${pro}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    // 劣势分析
    if (analysis.cons.length > 0) {
        html += `
            <div class="analysis-section cons-section">
                <h5>⚠️ 注意事项</h5>
                <ul>
                    ${analysis.cons.map(con => `<li>${con}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    // 风险提示
    if (analysis.risks.length > 0) {
        html += `
            <div class="analysis-section risks-section">
                <h5>🚨 风险提示</h5>
                <ul>
                    ${analysis.risks.map(risk => `<li>${risk}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    // 建议
    if (analysis.recommendations.length > 0) {
        html += `
            <div class="analysis-section recommendations-section">
                <h5>💡 优化建议</h5>
                <ul>
                    ${analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    analysisContainer.innerHTML = html;
    analysisContainer.style.display = 'block';
}