import React from 'react';

import SingleDatePicker from '../src/components/SingleDatePicker';

class SingleDatePickerWrapper extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      focused: false,
      date: null,
    };

    this.onComplete = this.onComplete.bind(this);
    this.onFocusChange = this.onFocusChange.bind(this);
  }

  onComplete(date) {
    this.setState({ date });
  }

  onFocusChange({ focused }) {
    this.setState({ focused });
  }

  render() {
    const { focused, date } = this.state;

    return (
      <SingleDatePicker
        {...this.props}
        id="date_input"
        date={date}
        focused={focused}
        onFocusChange={this.onFocusChange}
        onComplete={this.onComplete}
      />
    );
  }
}

export default SingleDatePickerWrapper;
