import React, { PropTypes } from 'react';
import cx from 'classnames';

class Button extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      pressDown: false
    }
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
  }

  onMouseDown() {
    this.setState({ pressDown: true });
  }

  onMouseUp() {
    this.setState({ pressDown: false });
  }

  render() {
    const { pressDown } = this.state;
    const { text, onClick, disabled } = this.props;
    const buttonClass = cx(
      'datepicker-button',
      disabled && 'datepicker-button-disabled',
      !disabled && pressDown && 'datepicker-button-pressDown'
    );
    const clickFunc = disabled ? () => {} : onClick;
    return (
      <div
        onMouseDown={this.onMouseDown}
        onMouseOut={this.onMouseUp}
        onMouseLeave={this.onMouseUp}
        onMouseUp={this.onMouseUp}
        onClick={clickFunc}
        className={buttonClass}>
        <div className="datepicker-button-text-wrapper">
          {text}
        </div>
      </div>
    )
  }
}

Button.propTypes = {
  text: PropTypes.string,
  disabled: PropTypes.bool,
  onClick: PropTypes.func
};

Button.defaultProps = {
  text: '',
  disabled: false,
  onClick: () => {}
};

export default Button;
