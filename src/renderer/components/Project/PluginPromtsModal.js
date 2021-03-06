/*
  插件提问模态框
  根据插件的提问内容渲染表单
*/
import React, { PropTypes, Component } from 'react';
import { connect } from 'dva';
import Row from 'antd/lib/row';
import Col from 'antd/lib/col';
import Form from 'antd/lib/form';
import Modal from 'antd/lib/modal';
import Input from 'antd/lib/input';
import Select from 'antd/lib/select';
import Switch from 'antd/lib/switch';
import Checkbox from 'antd/lib/checkbox';


import i18n from 'i18n-renderer-nowa';
import { NAME_MATCH } from 'const-renderer-nowa';

const FormItem = Form.Item;
const CheckboxGroup = Checkbox.Group;

const formItemLayout = {
  labelCol: { span: 6, offset: 1 },
  wrapperCol: { span: 15 }
};


const PluginPromtsModal = ({
  form: {
    getFieldDecorator,
    validateFields,
    setFieldsValue,
  },
  lang,
  dispatch,
  pluginPromts: { promts, uuid },
}) => {
  const handleCancle = () => {
    dispatch({
      type: 'plugin/changeStatus',
      payload: { showPromtsModal: false }
    });
  };

  const handleOk = () => {
    validateFields((err, answers) => {
      if (!err) {
        // const filter = promts.filter(item => item.type === 'text');
        // if (filter.length) {
        //   answers[filter[0].key] = filter[0].value;
        // }
        console.log(answers);

        dispatch({
          type: 'plugin/saveAnswers',
          payload: { answers, uuid }
        });
        
        handleCancle();
      }
    });
  };

  // 根据不同问题的type形式渲染不同表单，一共支持5种， 不支持联动表单
  const inputTemp = (obj) =>  {
    const rules = [{ required: true, message: i18n('msg.required') }];
    console.log(obj);
    if (obj.validator) {
      const validator = (rule, value, callback) => {
        const fn = new Function('label', `return ${obj.validator.func}`);
        if (!fn(value)) {
          callback(obj.validator.msg);
        }
        // if (!obj.validator.func(value)) {
        //   callback(obj.validator.msg);
        // }
        callback();
      };
      rules.push({ validator });
    }

    const options = {
      rules,
    };

    if (obj.default) {
      options.initialValue = obj.default;
    }

    return (
      <FormItem
        key={obj.key}
        {...formItemLayout}
        label={obj.label[lang]}
      >
        {getFieldDecorator(obj.key, options)(<Input />)}
      </FormItem>
    );
  };

  const textTemp = (obj) =>  {
    return (
      <FormItem
        key={obj.key}
        {...formItemLayout}
        label={obj.label[lang]}
      >
        <div className="promts-modal-form-text">{obj.value}</div>
      </FormItem>
    );
  };

  const selectTemp = (obj) =>  {
    let options = {};
    if (obj.default) {
      options.initialValue = obj.default;
    }

    return (
      <FormItem
        key={obj.key}
        {...formItemLayout}
        label={obj.label[lang]}
      >
        {getFieldDecorator(obj.key, options)(
          <Select>
            {
              obj.values.map(item =>
                <Select.Option key={item} value={item}>{item}</Select.Option>
              )
            }
          </Select>
        )}
      </FormItem>
    );
  };

  const switchTemp = (obj) =>  {
    let options = { valuePropName: 'checked' };
    if (obj.default) {
      options.initialValue = obj.default;
    }

    return (
      <FormItem
        key={obj.key}
        {...formItemLayout}
        label={obj.label[lang]}
      >
        {getFieldDecorator(obj.key, options)(<Switch size="small" />)}
      </FormItem>
    );
  };

  const checkboxTemp = (obj) =>  {
    let options = {};
    if (obj.default) {
      options.initialValue = obj.default;
    }

    const opt = obj.values.map(item => ({ label: item, value: item }));

    return (
      <FormItem
        key={obj.key}
        {...formItemLayout}
        label={obj.label[lang]}
      >
        {getFieldDecorator(obj.key, options)(
          <CheckboxGroup options={opt} />
        )}
      </FormItem>
    );
  };

  return (
    <Modal
      title={i18n('plugin.promts.title')}
      visible={true}
      onOk={handleOk}
      onCancel={handleCancle}
      okText={i18n('form.ok')}
      cancelText={i18n('form.cancel')}
    >
      <Form className="promts-modal-form">
        {
          promts.length > 0 && 
          promts.map(item => {
            let html;
            switch (item.type) {
              case 'text':
                html = textTemp(item);
                break;
              case 'input':
                html = inputTemp(item);
                break;
              case 'select':
                html = selectTemp(item);
                break;
              case 'checkbox':
                html = checkboxTemp(item);
                break;
              case 'switch':
                html = switchTemp(item);
                break;
              default:
                html = <div key={item.key} />;
                break;
            }
            return html;
          })
        }
      </Form>
    </Modal>
  );
};



PluginPromtsModal.propTypes = {
  form: PropTypes.shape({
    getFieldDecorator: PropTypes.func,
    setFieldsValue: PropTypes.func,
    validateFields: PropTypes.func,
  }).isRequired,
  dispatch: PropTypes.func.isRequired,
  lang: PropTypes.string.isRequired,
  pluginPromts: PropTypes.shape({
    promts: PropTypes.array,
    uuid: PropTypes.string,
  }).isRequired,
  // promts: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default Form.create()(connect(({ plugin, setting }) => ({
  lang: setting.lang,
  plugins: plugin.UIPluginList,
  pluginPromts: plugin.pluginPromts,
}))(PluginPromtsModal));
