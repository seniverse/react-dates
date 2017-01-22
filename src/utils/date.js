import moment from 'moment';

const formatDate = (date) => {
  return moment(date).format('YYYY/MM/DD');
};

export default {
  now: moment,
  format: formatDate,
  weekday: (i) => moment().weekday(parseInt(i)).format('dd'),
  month: {
    before: (month) => moment().add(-parseInt(month), 'months'),
    after: (month) => moment().add(parseInt(month), 'months'),
  }
}
