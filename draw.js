/*** 界面元素 ***/
//画圈按钮
var drawBtn = document.getElementById('draw')
//退出画圈按钮
var exitBtn = document.getElementById('exit')
//画圈完成的数据展示列表
var ul = document.getElementById('data')

/*** 画圈有关的数据结构 ***/
//是否处于画圈状态下
var isInDrawing = false;
//是否处于鼠标左键按下状态下
var isMouseDown = false;
//存储画出折线点的数组
var polyPointArray = [];
//上次操作画出的折线
var lastPolyLine = null;
//画圈完成后生成的多边形
var polygonAfterDraw = null;
//存储地图上marker的数组
var markerList = [];



window.onload = function(){
	//创建地图实例
	var map = new BMap.Map("container",{enableMapClick:false});
	// 创建点坐标
	var point = new BMap.Point(116.404, 39.915);
	// 初始化地图，设置中心点坐标和地图级别
	map.centerAndZoom(point, 15);
	// 开启鼠标滚轮缩放
	map.enableScrollWheelZoom(true);
	//初始化地图坐标点
	initMapMarkers(map)
	//绑定事件
	bindEvents(map)
}
//绑定按钮事件
function bindEvents(map){
	//开始画圈绑定事件
	drawBtn.addEventListener('click',function(e){
		//禁止地图移动点击等操作
		map.disableDragging();
		map.disableScrollWheelZoom();
		map.disableDoubleClickZoom();
		map.disableKeyboard();
		map.setDefaultCursor('crosshair');
		//设置标志位进入画圈状态
		isInDrawing = true;
	});
	//退出画圈按钮绑定事件
	exitBtn.addEventListener('click',function(e){
		//恢复地图移动点击等操作
		map.enableDragging();
		map.enableScrollWheelZoom();
		map.enableDoubleClickZoom();
		map.enableKeyboard();
		map.setDefaultCursor('default');
		//设置标志位退出画圈状态
		isInDrawing = false;
	})
	//为地图绑定鼠标按下事件(开始画圈)
	map.addEventListener('mousedown',function(e){
		//如果处于画圈状态下,清空上次画圈的数据结构,设置isMouseDown进入画圈鼠标按下状态
		if(isInDrawing){
			//清空地图上画的折线和圈
			map.removeOverlay(polygonAfterDraw);
			map.removeOverlay(lastPolyLine);
			polyPointArray = [];
			lastPolyLine = null;
			isMouseDown = true;
		}
	});
	//为地图绑定鼠标抬起事件(画圈完成)
	map.addEventListener('mouseup',function(e){
		//如果处于画圈状态下 且 鼠标是按下状态
		if(isInDrawing && isMouseDown){
			//退出画线状态
			isMouseDown = false;
			//添加多边形覆盖物,设置为禁止点击
			var polygon = new window.BMap.Polygon(polyPointArray,{
				strokeColor:'#00ae66',
				strokeOpacity:1,
				fillColor:'#00ae66',
				fillOpacity:0.3,
				enableClicking:false
			});
			map.addOverlay(polygon);
			//保存多边形,用于后续删除该多边形
			polygonAfterDraw = polygon
			//计算房屋对于多边形的包含情况
			var ret = caculateEstateContainedInPolygon(polygonAfterDraw);
			//更新dom结构
			ul.innerHTML = '';
			var fragment = document.createDocumentFragment();
			for(var i=0;i<ret.length;i++){
				var li = document.createElement('li');
				li.innerText ? li.innerText = ret[i] : li.textContent = ret[i];
				fragment.appendChild(li);
			}
			ul.appendChild(fragment);
		}
	});
	//为地图绑定鼠标移动事件(触发画图)
	map.addEventListener('mousemove',function(e){
		//如果处于鼠标按下状态,才能进行画操作
		if(isMouseDown){
			//将鼠标移动过程中采集到的路径点加入数组保存
			polyPointArray.push(e.point);
			//除去上次的画线
			if(lastPolyLine) {
				map.removeOverlay(lastPolyLine)
			}
			//根据已有的路径数组构建画出的折线
			var polylineOverlay = new window.BMap.Polyline(polyPointArray,{
				strokeColor:'#00ae66',
				strokeOpacity:1,
				enableClicking:false
			});
			//添加新的画线到地图上
			map.addOverlay(polylineOverlay);
			//更新上次画线条
			lastPolyLine = polylineOverlay
		}
	})
}
//初始化地图坐标点
function initMapMarkers(map){
	//地图上需要标注点的坐标信息(经度,纬度,文本描述)
	var dataList = [
		[116.351951,39.929543,'北京国宾酒店'],
		[116.404556,39.92069,'故宫博物院'],
		[116.479008,39.925781,'呼家楼'],
		[116.368624,39.870869,'首都医科大学'],
		[116.4471,39.849601,'宋家庄']
	];
	//创建marker和label(文字标签)并显示在地图上
	dataList.forEach(function(item){
		var point = new BMap.Point(item[0],item[1])
		var marker = new BMap.Marker(point);
		var label = new BMap.Label(item[2],{offset:new BMap.Size(20,-10)});
		marker.setLabel(label);
		markerList.push(marker);
		map.addOverlay(marker)
	})
}

//计算地图上点的包含状态
function caculateEstateContainedInPolygon(polygon){
	//得到多边形的点数组
	var pointArray = polygon.getPath();
	//获取多边形的外包矩形
	var bound = polygon.getBounds();
	//在多边形内的点的数组
	var pointInPolygonArray = [];
	//计算每个点是否包含在该多边形内
	for(var i=0;i<markerList.length;i++){
		//该marker的坐标点
		var markerPoint = markerList[i].getPosition();
		if(isPointInPolygon(markerPoint,bound,pointArray)){
			pointInPolygonArray.push(markerList[i])
		}
	}
	var estateListAfterDrawing = pointInPolygonArray.map(function(item){
		return item.getLabel().getContent()
	})
	return estateListAfterDrawing
}

//判定一个点是否包含在多边形内
function isPointInPolygon(point,bound,pointArray){
	//首先判断该点是否在外包矩形内，如果不在直接返回false
	if(!bound.containsPoint(point)){
		return false;
	}
	//如果在外包矩形内则进一步判断
	//该点往右侧发出的射线和矩形边交点的数量,若为奇数则在多边形内，否则在外
	var crossPointNum = 0;
	for(var i=0;i<pointArray.length;i++){
		//获取2个相邻的点
		var p1 = pointArray[i];
		var p2 = pointArray[(i+1)%pointArray.length];
		//如果点相等直接返回true
		if((p1.lng===point.lng && p1.lat===point.lat)||(p2.lng===point.lng && p2.lat===point.lat)){
			return true
		}
		//如果point在2个点所在直线的下方则continue
		if(point.lat < Math.min(p1.lat,p2.lat)){
			continue;
		}
		//如果point在2个点所在直线的上方则continue
		if(point.lat >= Math.max(p1.lat,p2.lat)){
			continue;
		}
		//有相交情况:2个点一上一下,计算交点
		//特殊情况2个点的横坐标相同
		var crossPointLng;
		if(p1.lng === p2.lng){
			crossPointLng = p1.lng;
		}else{
			//计算2个点的斜率
			var k = (p2.lat - p1.lat)/(p2.lng - p1.lng);
			//得出水平射线与这2个点形成的直线的交点的横坐标
			crossPointLng = (point.lat - p1.lat)/k + p1.lng;
		}
		//如果crossPointLng的值大于point的横坐标则算交点(因为是右侧相交)
		if(crossPointLng > point.lng){
			crossPointNum++;
		}

	}
	//如果是奇数个交点则点在多边形内
	return crossPointNum%2===1
}
