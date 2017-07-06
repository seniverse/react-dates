import React from 'react';
import ReactDOM from 'react-dom';
import moment from 'moment';
import cx from 'classnames';
import Portal from 'react-portal';

import isTouchDevice from '../utils/isTouchDevice';
import getResponsiveContainerStyles from '../utils/getResponsiveContainerStyles';

import isInclusivelyAfterDay from '../utils/isInclusivelyAfterDay';

import DateRangePickerInputController from './DateRangePickerInputController';
import DayPickerRangeController from './DayPickerRangeController';

import CloseButton from '../svg/close.svg';

import DateRangePickerShape from '../shapes/DateRangePickerShape';

import {
  START_DATE,
  END_DATE,
  HORIZONTAL_ORIENTATION,
  VERTICAL_ORIENTATION,
  ANCHOR_LEFT,
  ANCHOR_RIGHT,
} from '../../constants';

const propTypes = DateRangePickerShape;

const defaultProps = {
  startDateId: START_DATE,
  endDateId: END_DATE,
  focusedInput: null,
  minimumNights: 1,
  isDayBlocked: () => false,
  isDayHighlighted: () => false,
  isOutsideRange: day => !isInclusivelyAfterDay(day, moment()),
  enableOutsideDays: false,
  numberOfMonths: 2,
  showClearDates: false,
  disabled: false,
  required: false,
  reopenPickerOnClearDates: false,
  keepOpenOnDateSelect: true,
  initialVisibleMonth: () => moment(),
  navPrev: null,
  navNext: null,

  orientation: HORIZONTAL_ORIENTATION,
  anchorDirection: ANCHOR_LEFT,
  horizontalMargin: 0,
  withPortal: false,
  withFullScreenPortal: false,

  onFocusChange() {},
  onPrevMonthClick() {},
  onNextMonthClick() {},
  onComplete() {},

  // i18n
  displayFormat: () => moment.localeData().longDateFormat('L'),
  monthFormat: 'MMMM YYYY',
  phrases: {
    closeDatePicker: 'Close',
    clearDates: 'Clear Dates',
  },
  color: 'green',
};

export default class DateRangePicker extends React.Component {
  constructor(props) {
    super(props);
    const { startDate, endDate } = props;
    this.initialStartDate = startDate;
    this.initialEndDate = endDate;
    this.state = {
      dayPickerContainerStyles: {},
      startDate,
      endDate,
    };

    this.isTouchDevice = isTouchDevice();

    this.onComplete = this.onComplete.bind(this);
    this.onDatesChange = this.onDatesChange.bind(this);
    this.onOutsideClick = this.onOutsideClick.bind(this);
    this.onClearDates = this.onClearDates.bind(this);

    this.responsivizePickerPosition = this.responsivizePickerPosition.bind(this);
  }

  componentDidMount() {
    window.addEventListener('resize', this.responsivizePickerPosition);
    this.responsivizePickerPosition();
  }

  componentWillUpdate(nextProps) {
    const {
      startDate,
      endDate,
    } = nextProps;
    if (this.props.startDate !== startDate || this.props.endDate !== endDate) {
      this.initialStartDate = startDate;
      this.initialEndDate = endDate;
      this.setState({
        startDate,
        endDate,
      });
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.responsivizePickerPosition);
  }

  onOutsideClick() {
    this.setState({
      startDate: this.initialStartDate,
      endDate: this.initialEndDate,
    });
    this.onClearFocus();
  }

  onComplete() {
    this.onClearFocus();
    const { startDate, endDate } = this.state;
    if (startDate === this.initialStartDate && endDate === this.initialEndDate) {
      return;
    }
    const { onComplete } = this.props;
    this.initialStartDate = startDate;
    this.initialEndDate = endDate;
    if (onComplete) {
      onComplete({
        startDate,
        endDate,
      });
    }
  }

  onClearDates() {
    const { reopenPickerOnClearDates, onFocusChange, onComplete } = this.props;
    const startDate = null;
    const endDate = null;
    this.onDatesChange({ startDate, endDate });
    this.initialStartDate = null;
    this.initialEndDate = null;
    if (onComplete) {
      onComplete({
        startDate,
        endDate,
      });
    }
    if (reopenPickerOnClearDates) {
      onFocusChange(START_DATE);
    }
  }

  onDatesChange({ startDate, endDate }) {
    this.setState({ startDate, endDate });
  }

  onClearFocus() {
    const { focusedInput, onFocusChange } = this.props;
    if (!focusedInput) return;
    onFocusChange(null);
  }

  getDayPickerContainerClasses() {
    const {
      focusedInput,
      orientation,
      withPortal,
      withFullScreenPortal,
      anchorDirection,
    } = this.props;
    const showDatepicker = focusedInput === START_DATE || focusedInput === END_DATE;

    const dayPickerClassName = cx('DateRangePicker__picker', {
      'DateRangePicker__picker--show': showDatepicker,
      'DateRangePicker__picker--invisible': !showDatepicker,
      'DateRangePicker__picker--direction-left': anchorDirection === ANCHOR_LEFT,
      'DateRangePicker__picker--direction-right': anchorDirection === ANCHOR_RIGHT,
      'DateRangePicker__picker--horizontal': orientation === HORIZONTAL_ORIENTATION,
      'DateRangePicker__picker--vertical': orientation === VERTICAL_ORIENTATION,
      'DateRangePicker__picker--portal': withPortal || withFullScreenPortal,
      'DateRangePicker__picker--full-screen-portal': withFullScreenPortal,
    });

    return dayPickerClassName;
  }

  getDayPickerDOMNode() {
    return ReactDOM.findDOMNode(this.dayPicker);
  }

  responsivizePickerPosition() {
    const { anchorDirection, horizontalMargin, withPortal, withFullScreenPortal } = this.props;
    const { dayPickerContainerStyles } = this.state;

    const isAnchoredLeft = anchorDirection === ANCHOR_LEFT;
    if (!withPortal && !withFullScreenPortal) {
      const containerRect = this.dayPickerContainer.getBoundingClientRect();
      const currentOffset = dayPickerContainerStyles[anchorDirection] || 0;
      const containerEdge =
        isAnchoredLeft ? containerRect[ANCHOR_RIGHT] : containerRect[ANCHOR_LEFT];

      this.setState({
        dayPickerContainerStyles: getResponsiveContainerStyles(
          anchorDirection,
          currentOffset,
          containerEdge,
          horizontalMargin,
        ),
      });
    }
  }

  maybeRenderDayPickerWithPortal() {
    const { focusedInput, withPortal, withFullScreenPortal } = this.props;

    if (withPortal || withFullScreenPortal) {
      return (
        <Portal isOpened={focusedInput !== null}>
          {this.renderDayPicker()}
        </Portal>
      );
    }

    return this.renderDayPicker();
  }

  renderDayPicker() {
    const {
      color,
      isDayBlocked,
      isDayHighlighted,
      isOutsideRange,
      numberOfMonths,
      orientation,
      monthFormat,
      navPrev,
      navNext,
      onPrevMonthClick,
      onNextMonthClick,
      onFocusChange,
      withPortal,
      withFullScreenPortal,
      enableOutsideDays,
      initialVisibleMonth,
      focusedInput,
      minimumNights,
      keepOpenOnDateSelect,
    } = this.props;

    const { dayPickerContainerStyles, startDate, endDate } = this.state;

    const onOutsideClick = !withFullScreenPortal ? this.onOutsideClick : undefined;

    return (
      <div
        ref={(ref) => { this.dayPickerContainer = ref; }}
        className={this.getDayPickerContainerClasses()}
        style={dayPickerContainerStyles}
      >
        <DayPickerRangeController
          ref={(ref) => { this.dayPicker = ref; }}
          orientation={orientation}
          enableOutsideDays={enableOutsideDays}
          numberOfMonths={numberOfMonths}
          onDayMouseEnter={this.onDayMouseEnter}
          onDayMouseLeave={this.onDayMouseLeave}
          onDayMouseDown={this.onDayClick}
          onDayTouchTap={this.onDayClick}
          onPrevMonthClick={onPrevMonthClick}
          onNextMonthClick={onNextMonthClick}
          onDatesChange={this.onDatesChange}
          onFocusChange={onFocusChange}
          focusedInput={focusedInput}
          startDate={startDate}
          endDate={endDate}
          monthFormat={monthFormat}
          withPortal={withPortal || withFullScreenPortal}
          hidden={!focusedInput}
          initialVisibleMonth={initialVisibleMonth}
          onOutsideClick={onOutsideClick}
          navPrev={navPrev}
          navNext={navNext}
          minimumNights={minimumNights}
          isOutsideRange={isOutsideRange}
          isDayHighlighted={isDayHighlighted}
          isDayBlocked={isDayBlocked}
          keepOpenOnDateSelect={keepOpenOnDateSelect}
          onComplete={this.onComplete}
          color={color}
        />

        {withFullScreenPortal &&
          <button
            className="DateRangePicker__close"
            type="button"
            onClick={this.onOutsideClick}
          >
            <span className="screen-reader-only">
              {this.props.phrases.closeDatePicker}
            </span>
            <CloseButton />
          </button>
        }
      </div>
    );
  }

  render() {
    const {
      color,
      startDateId,
      startDatePlaceholderText,
      endDateId,
      endDatePlaceholderText,
      focusedInput,
      showClearDates,
      disabled,
      required,
      phrases,
      isOutsideRange,
      withPortal,
      withFullScreenPortal,
      displayFormat,
      keepOpenOnDateSelect,
      onDatesChange,
      onFocusChange,
    } = this.props;

    const { startDate, endDate } = this.state;

    return (
      <div className="DateRangePicker">
        <DateRangePickerInputController
          startDate={startDate}
          startDateId={startDateId}
          startDatePlaceholderText={startDatePlaceholderText}
          isStartDateFocused={focusedInput === START_DATE}
          endDate={endDate}
          endDateId={endDateId}
          endDatePlaceholderText={endDatePlaceholderText}
          isEndDateFocused={focusedInput === END_DATE}
          displayFormat={displayFormat}
          showClearDates={showClearDates}
          showCaret={!withPortal && !withFullScreenPortal}
          disabled={disabled}
          required={required}
          keepOpenOnDateSelect={keepOpenOnDateSelect}
          isOutsideRange={isOutsideRange}
          withFullScreenPortal={withFullScreenPortal}
          onDatesChange={onDatesChange}
          onFocusChange={onFocusChange}
          phrases={phrases}
          onClearDates={this.onClearDates}
          color={color}
        />
        {this.maybeRenderDayPickerWithPortal()}
      </div>
    );
  }
}

DateRangePicker.propTypes = propTypes;
DateRangePicker.defaultProps = defaultProps;
