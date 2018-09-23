
import graphql from './graphql'
import merge from 'lodash/merge'

export default ({
  dispatch,
  getState,
  reducerName,
  name,
  actionType,
  restart,
  filters,
  schemaName = '',
  processList = data => data,
  // accessToken = '',
  callback = () => {}
}) => {
  return new Promise(async (resolve, reject) => {

    let select = filters.select || ``,
        state = getState(),
        list = state[reducerName][name] || {};

    filters = filters.variables || filters.query || {};

    // 让列表重新开始
    if (restart) {
      list = { data: list.data };
    }

    // 已经加载所有，没有更多了
    if (list.more && !list.more) {
      resolve([ null, list ]);
      callback([ null, list ]);
      return
    }

    // 如果正在加载中，则阻止本次请求
    if (list.loading) return;

    if (!list.data) list.data = [];

    // 添加页面size和number
    if (!list.filters) {
      if (!filters.page_number) filters.page_number = 1;
      if (!filters.page_size) filters.page_size = 25;
      filters.page_number = parseInt(filters.page_number);
      filters.page_size = parseInt(filters.page_size);
      list.filters = filters;
    } else {
      // 如果以及存在筛选条件，那么下次请求，进行翻页
      filters = list.filters;
      filters.page_number += 1;
    }

    list.loading = true;

    if (actionType) dispatch({ type: actionType, name, data: list });

    let [ err, data ] = await graphql({
      api: schemaName,
      args: filters,
      fields: select,
      headers: { 'AccessToken': state.user.accessToken }
    });

    if (err) {

      list.loading = false;

      resolve([ null, list ]);
      callback([ null, list ]);

      // resolve([ err ]);
      // callback([ err ]);
      return
    }
    
    if (restart) list.data = [];

    list.data = list.data.concat(processList(merge([], data)));
    list.filters = filters;
    list.loading = false;

    // 如果列表不存在count，那么查询count
    if (!list.count) {

      let s = Object.assign({}, filters);
      delete s.page_size;
      delete s.page_number;
      delete s.sort_by;

      let [ err, data ] = await graphql({
        api: 'count' + schemaName.charAt(0).toUpperCase() + schemaName.slice(1),
        args: s,
        fields: `count`,
        headers: { 'AccessToken': state.user.accessToken }
      })

      if (data) list.count = data.count;

    }

    list.more = list.filters.page_size * list.filters.page_number > list.count ? false : true

    if (actionType) dispatch({ type: actionType, name, data: list });

    resolve([ null, list ]);
    callback([ null, list ]);
  })

}
