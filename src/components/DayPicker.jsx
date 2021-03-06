import React, { PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import ReactDOM from 'react-dom';
import cx from 'classnames';
import momentPropTypes from 'react-moment-proptypes';

import OutsideClickHandler from './OutsideClickHandler';
import CalendarMonthGrid from './CalendarMonthGrid';
import DayPickerNavigation from './DayPickerNavigation';
import Button from './Button';

import getTransformStyles from '../utils/getTransformStyles';
import dateHelper from '../utils/date';

import OrientationShape from '../shapes/OrientationShape';

import {
  HORIZONTAL_ORIENTATION,
  VERTICAL_ORIENTATION,
} from '../../constants';

const CALENDAR_MONTH_WIDTH = 300;
const DAY_PICKER_PADDING = 9;
const ACTION_PANE_WIDTH = 120;
const MONTH_PADDING = 23;
const PREV_TRANSITION = 'prev';
const NEXT_TRANSITION = 'next';

const propTypes = {
  startDate: momentPropTypes.momentObj,
  endDate: momentPropTypes.momentObj,
  enableOutsideDays: PropTypes.bool,
  numberOfMonths: PropTypes.number,
  modifiers: PropTypes.object,
  orientation: OrientationShape,
  withPortal: PropTypes.bool,
  hidden: PropTypes.bool,
  initialVisibleMonth: PropTypes.func,

  navPrev: PropTypes.node,
  navNext: PropTypes.node,

  onDayClick: PropTypes.func,
  onDayMouseDown: PropTypes.func,
  onDayMouseUp: PropTypes.func,
  onDayMouseEnter: PropTypes.func,
  onDayMouseLeave: PropTypes.func,
  onDayTouchStart: PropTypes.func,
  onDayTouchEnd: PropTypes.func,
  onDayTouchTap: PropTypes.func,
  onPrevMonthClick: PropTypes.func,
  onNextMonthClick: PropTypes.func,
  onOutsideClick: PropTypes.func,
  onComplete: PropTypes.func,
  onDatesChange: PropTypes.func,

  // i18n
  monthFormat: PropTypes.string,
  color: PropTypes.string,
};

const defaultProps = {
  startDate: null,
  endDate: null,
  enableOutsideDays: false,
  numberOfMonths: 1,
  modifiers: {},
  orientation: HORIZONTAL_ORIENTATION,
  withPortal: false,
  hidden: false,

  initialVisibleMonth: dateHelper.now,

  navPrev: null,
  navNext: null,

  onDayClick() {},
  onDayMouseDown() {},
  onDayMouseUp() {},
  onDayMouseEnter() {},
  onDayMouseLeave() {},
  onDayTouchStart() {},
  onDayTouchTap() {},
  onDayTouchEnd() {},
  onPrevMonthClick() {},
  onNextMonthClick() {},
  onOutsideClick() {},
  onComplete() {},
  onDatesChange() {},

  // i18n
  monthFormat: 'MMMM YYYY',
  color: 'green',
};

function applyTransformStyles(el, transform, opacity = '') {
  const transformStyles = getTransformStyles(transform);
  transformStyles.opacity = opacity;

  Object.keys(transformStyles).forEach((styleKey) => {
    // eslint-disable-next-line no-param-reassign
    el.style[styleKey] = transformStyles[styleKey];
  });
}

export function calculateDimension(el, axis, borderBox = false, withMargin = false) {
  if (!el) {
    return 0;
  }

  const axisStart = (axis === 'width') ? 'Left' : 'Top';
  const axisEnd = (axis === 'width') ? 'Right' : 'Bottom';

  // Only read styles if we need to
  const style = (!borderBox || withMargin) ? window.getComputedStyle(el) : {};

  // Offset includes border and padding
  let size = (axis === 'width') ? el.offsetWidth : el.offsetHeight;

  // Get the inner size
  if (!borderBox) {
    size -= (
      parseFloat(style[`padding${axisStart}`]) +
      parseFloat(style[`padding${axisEnd}`]) +
      parseFloat(style[`border${axisStart}Width`]) +
      parseFloat(style[`border${axisEnd}Width`])
    );
  }

  // Apply margin
  if (withMargin) {
    size += (
      parseFloat(style[`margin${axisStart}`]) +
      parseFloat(style[`margin${axisEnd}`])
    );
  }

  return size;
}

function getMonthHeight(el) {
  const caption = el.querySelector('.js-CalendarMonth__caption');
  const grid = el.querySelector('.js-CalendarMonth__grid');

  // Need to separate out table children for FF
  // Add an additional +1 for the border
  return (
    calculateDimension(caption, 'height', true, true) + calculateDimension(grid, 'height') + 1
  );
}

export default class DayPicker extends React.Component {
  constructor(props) {
    super(props);

    this.hasSetInitialVisibleMonth = !props.hidden;
    this.state = {
      currentMonth: props.hidden ? dateHelper.now() : props.initialVisibleMonth(),
      monthTransition: null,
      translationValue: 0,
    };

    this.onPrevMonthClick = this.onPrevMonthClick.bind(this);
    this.onNextMonthClick = this.onNextMonthClick.bind(this);
    this.choseRecentMonth = this.choseRecentMonth.bind(this);
    this.updateStateAfterMonthTransition = this.updateStateAfterMonthTransition.bind(this);
  }

  componentDidMount() {
    if (this.isHorizontal()) {
      this.adjustDayPickerHeight();
      this.initializeDayPickerWidth();
    }
  }

  componentWillReceiveProps(nextProps) {
    if (!nextProps.hidden) {
      if (!this.hasSetInitialVisibleMonth) {
        this.hasSetInitialVisibleMonth = true;
        this.setState({
          currentMonth: nextProps.initialVisibleMonth(),
        });
      }

      if (!this.dayPickerWidth && this.isHorizontal()) {
        this.initializeDayPickerWidth();
        this.adjustDayPickerHeight();
      }
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    return shallowCompare(this, nextProps, nextState);
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.monthTransition || !this.state.currentMonth.isSame(prevState.currentMonth)) {
      if (this.isHorizontal()) {
        this.adjustDayPickerHeight();
      }
    }
  }

  onPrevMonthClick(e) {
    if (e) e.preventDefault();

    if (this.props.onPrevMonthClick) {
      this.props.onPrevMonthClick(e);
    }

    const translationValue =
      this.isVertical() ? this.getMonthHeightByIndex(0) : this.dayPickerWidth;

    // The first CalendarMonth is always positioned absolute at top: 0 or left: 0
    // so we need to transform it to the appropriate location before the animation.
    // This behavior is because we would otherwise need a double-render in order to
    // adjust the container position once we had the height the first calendar
    // (ie first draw all the calendar, then in a second render, use the first calendar's
    // height to position the container). Variable calendar heights, amirite? <3 Maja
    this.translateFirstDayPickerForAnimation(translationValue);

    this.setState({
      monthTransition: PREV_TRANSITION,
      translationValue,
    });
  }

  onNextMonthClick(e) {
    if (e) e.preventDefault();
    if (this.props.onNextMonthClick) {
      this.props.onNextMonthClick(e);
    }

    const translationValue =
      this.isVertical() ? -this.getMonthHeightByIndex(1) : -this.dayPickerWidth;

    this.setState({
      monthTransition: NEXT_TRANSITION,
      translationValue,
    });
  }

  getMonthHeightByIndex(i) {
    return getMonthHeight(
      ReactDOM.findDOMNode(this.transitionContainer).querySelectorAll('.CalendarMonth')[i],
    );
  }

  isHorizontal() {
    return this.props.orientation === HORIZONTAL_ORIENTATION;
  }

  isVertical() {
    return this.props.orientation === VERTICAL_ORIENTATION;
  }

  initializeDayPickerWidth() {
    this.dayPickerWidth = calculateDimension(
      ReactDOM.findDOMNode(this.calendarMonthGrid).querySelector('.CalendarMonth'),
      'width',
      true,
    );
  }

  updateStateAfterMonthTransition() {
    const { currentMonth, monthTransition } = this.state;

    let newMonth = currentMonth;
    if (monthTransition === PREV_TRANSITION) {
      newMonth = currentMonth.clone().subtract(1, 'month');
    } else if (monthTransition === NEXT_TRANSITION) {
      newMonth = currentMonth.clone().add(1, 'month');
    }

    // clear the previous transforms
    applyTransformStyles(
      ReactDOM.findDOMNode(this.calendarMonthGrid).querySelector('.CalendarMonth'),
      'none',
    );

    this.setState({
      currentMonth: newMonth,
      monthTransition: null,
      translationValue: 0,
    });
  }

  adjustDayPickerHeight() {
    const transitionContainer = ReactDOM.findDOMNode(this.transitionContainer);
    const actionPane = ReactDOM.findDOMNode(this.actionPane);
    const heights = [];

    Array.prototype.forEach.call(transitionContainer.querySelectorAll('.CalendarMonth'), (el) => {
      if (el.getAttribute('data-visible') === 'true') {
        heights.push(getMonthHeight(el));
      }
    });

    const newMonthHeight = Math.max(...heights) + MONTH_PADDING;

    if (newMonthHeight !== calculateDimension(transitionContainer, 'height')) {
      this.monthHeight = newMonthHeight;
      transitionContainer.style.height = `${newMonthHeight}px`;
      actionPane.style.height = `${newMonthHeight}px`;
    }
  }

  translateFirstDayPickerForAnimation(translationValue) {
    const transformType = this.isVertical() ? 'translateY' : 'translateX';
    const transformValue = `${transformType}(-${translationValue}px)`;

    applyTransformStyles(
      ReactDOM.findDOMNode(this.transitionContainer).querySelector('.CalendarMonth'),
      transformValue,
      1,
    );
  }

  choseRecentMonth() {
    const { onDatesChange } = this.props;
    const now = dateHelper.now();
    const oneMonthAgo = dateHelper.month.before(1);
    if (onDatesChange) {
      onDatesChange({
        startDate: oneMonthAgo,
        endDate: now,
      });
    }
  }

  renderNavigation() {
    const {
      navPrev,
      navNext,
    } = this.props;

    return (
      <DayPickerNavigation
        onPrevMonthClick={this.onPrevMonthClick}
        onNextMonthClick={this.onNextMonthClick}
        navPrev={navPrev}
        navNext={navNext}
        isVertical={this.isVertical()}
        style={{
          width: this.calendarWidth,
        }}
      />
    );
  }

  renderWeekHeader(index) {
    const horizontalStyle = {
      left: index * CALENDAR_MONTH_WIDTH,
    };

    const style = this.isHorizontal() ? horizontalStyle : {};

    const header = [];
    for (let i = 0; i < 7; i += 1) {
      header.push(
        <li key={i}>
          <small>{dateHelper.weekday(i)}</small>
        </li>,
      );
    }

    return (
      <div
        className="DayPicker__week-header"
        key={`week-${index}`}
        style={style}
      >
        <ul>
          {header}
        </ul>
      </div>
    );
  }

  get calendarWidth() {
    const { numberOfMonths } = this.props;
    return horizontalWidth = (CALENDAR_MONTH_WIDTH * numberOfMonths) + (2 * DAY_PICKER_PADDING);
  }

  render() {
    const { currentMonth, monthTransition, translationValue } = this.state;
    const {
      enableOutsideDays,
      numberOfMonths,
      orientation,
      modifiers,
      withPortal,
      onDayClick,
      onDayMouseDown,
      onDayMouseUp,
      onDayTouchStart,
      onDayTouchEnd,
      onDayTouchTap,
      onDayMouseEnter,
      onDayMouseLeave,
      onOutsideClick,
      monthFormat,
      onComplete,
      startDate,
      endDate,
      color,
    } = this.props;

    const numOfWeekHeaders = this.isVertical() ? 1 : numberOfMonths;
    const weekHeaders = [];
    for (let i = 0; i < numOfWeekHeaders; i += 1) {
      weekHeaders.push(this.renderWeekHeader(i));
    }

    let firstVisibleMonthIndex = 1;
    if (monthTransition === PREV_TRANSITION) {
      firstVisibleMonthIndex -= 1;
    } else if (monthTransition === NEXT_TRANSITION) {
      firstVisibleMonthIndex += 1;
    }

    const dayPickerClassNames = cx('DayPicker', {
      'DayPicker--horizontal': this.isHorizontal(),
      'DayPicker--vertical': this.isVertical(),
      'DayPicker--portal': withPortal,
      [color]: true,
    });

    const transitionContainerClasses = cx('transition-container', {
      'transition-container--horizontal': this.isHorizontal(),
      'transition-container--vertical': this.isVertical(),
    });

    const horizontalWidth = this.calendarWidth;

    // this is a kind of made-up value that generally looks good. we'll
    // probably want to let the user set this explicitly.
    const verticalHeight = 1.75 * CALENDAR_MONTH_WIDTH;

    const dayPickerStyle = {
      width: this.isHorizontal() && (this.calendarWidth + ACTION_PANE_WIDTH + 10),

      // These values are to center the datepicker (approximately) on the page
      marginLeft: this.isHorizontal() && withPortal && -horizontalWidth / 2,
      marginTop: this.isHorizontal() && withPortal && -CALENDAR_MONTH_WIDTH / 2,
    };

    const transitionContainerStyle = {
      width: this.isHorizontal() && horizontalWidth,
      height: this.isVertical() && !withPortal && verticalHeight,
    };

    const isCalendarMonthGridAnimating = monthTransition !== null;
    const transformType = this.isVertical() ? 'translateY' : 'translateX';
    const transformValue = `${transformType}(${translationValue}px)`;

    const oneMonthAgo = dateHelper.month.before(1);

    const actionButtonActive = dateHelper.format(startDate) === dateHelper.format(oneMonthAgo) && dateHelper.format(endDate) === dateHelper.format(dateHelper.now());
    const qucikActionClass = cx(
      'quick-action',
      actionButtonActive && 'active',
    );

    return (
      <div className={dayPickerClassNames} style={dayPickerStyle} >
        <OutsideClickHandler onOutsideClick={onOutsideClick}>
          {this.renderNavigation()}

          <div className="DayPicker__week-headers">
            {weekHeaders}
          </div>

          <div
            className={transitionContainerClasses}
            ref={ref => (this.transitionContainer = ref)}
            style={transitionContainerStyle}
          >
            <CalendarMonthGrid
              color={color}
              ref={ref => (this.calendarMonthGrid = ref)}
              transformValue={transformValue}
              enableOutsideDays={enableOutsideDays}
              firstVisibleMonthIndex={firstVisibleMonthIndex}
              initialMonth={currentMonth}
              isAnimating={isCalendarMonthGridAnimating}
              modifiers={modifiers}
              orientation={orientation}
              withPortal={withPortal}
              numberOfMonths={numberOfMonths}
              onDayClick={onDayClick}
              onDayMouseDown={onDayMouseDown}
              onDayMouseUp={onDayMouseUp}
              onDayTouchStart={onDayTouchStart}
              onDayTouchEnd={onDayTouchEnd}
              onDayTouchTap={onDayTouchTap}
              onDayMouseEnter={onDayMouseEnter}
              onDayMouseLeave={onDayMouseLeave}
              onMonthTransitionEnd={this.updateStateAfterMonthTransition}
              monthFormat={monthFormat}
            />
          </div>
          <div
            ref={ref => (this.actionPane = ref)}
            className="ActionPane"
          >
            <div className={qucikActionClass}>
              <div
                onClick={this.choseRecentMonth}
                className="pane-quick-button"
              >
                最近一个月
              </div>
            </div>
            <div className="pane-button-wrapper">
              <Button
                color={color}
                text="确定"
                onClick={onComplete}
              />
            </div>
          </div>
        </OutsideClickHandler>
      </div>
    );
  }
}

DayPicker.propTypes = propTypes;
DayPicker.defaultProps = defaultProps;
