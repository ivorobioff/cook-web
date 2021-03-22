import React, {Component, ReactElement, Fragment} from 'react';
import {Box, Checkbox, FormControl, FormControlLabel, InputLabel, MenuItem, Select, TextField, FormLabel, RadioGroup, Radio} from "@material-ui/core";
import {clone, cloneExcept, cloneWith, hasField, objectEmpty, readField, tryField} from "../../random/utils";
import {isBlank} from "../../validation/utils";
import FormHelperText from '@material-ui/core/FormHelperText';
import { Autocomplete } from '@material-ui/lab';
import { DatePicker, MuiPickersUtilsProvider } from '@material-ui/pickers';
import MomentUtils from '@date-io/moment';

export type DataFormResult = {[field: string]: any};
export type DataFormErrors = {[field: string]: any};
export type DataFormResultProvider = () => DataFormResult | null;
export type DataFormInputHandler = (value: any) => void;
export type DataFormReadyHandler = (provider: DataFormResultProvider) => void;
export type DataFormValidator = (value: any) => string | null | undefined;
export type DataFormConverter= (value: any) => any;
export type DataFormTouchHandler = () => void;
export type DataFormErrorHandler = (valid: boolean) => void;
export type DataFormValidateHandler = (result: DataFormResult) => DataFormErrors;
export type DataFormRendererRegistry = {[name: string]: () => ReactElement};
export type DataFormLayoutProvider = (renderers: DataFormRendererRegistry) => ReactElement;


export interface DataFormControl {
    type: string;
    label: string;
    name: string;
    value?: any;
    disabled?: boolean;
    values?: {[key: string]: string};
    onInput?: DataFormInputHandler;
    validate?: DataFormValidator;
    required?: boolean | string;
    convertOut?: DataFormConverter;
    uselessOut?: any;
    convertIn?: DataFormConverter;
    uselessIn?: any;
    extra?: any;
}

export interface DataFormProps {
    className?: string;
    controls: DataFormControl[];
    errors?: {[field: string]: string};
    onReady?: DataFormReadyHandler;
    onTouch?: DataFormTouchHandler;
    onError?: DataFormErrorHandler;
    onValidate?: DataFormValidateHandler,
    autoComplete?: 'on'|'off';
    fresh?: boolean;
    layout?: DataFormLayoutProvider;
}

type DataFormInput = { value: any, error?: string | null | undefined};
type DataFormInputs = {[field: string]: DataFormInput}

interface DataFormState {
    inputs: DataFormInputs;
}

export type DataFormControlRenderer = (
    control: DataFormControl,
    context: DataFormRenderContext) => ReactElement;

interface DataFormRenderContext {
    onChange:(value: any) => void;
    state: DataFormState;
}

function hasError(inputs: DataFormInputs, controls: DataFormControl[]): boolean {

    let disabledControls = disabledControlNames(controls);

    return !!Object.keys(inputs)
        .find(n => inputs[n].error && disabledControls.indexOf(n) === -1);
}

function resolveValue(control: DataFormControl, context: DataFormRenderContext): any;
function resolveValue(control: DataFormControl, input: DataFormInput): any

function resolveValue(control: DataFormControl, param: DataFormRenderContext | DataFormInput): any {

    let input = hasField(param, 'state')
        ? (param as DataFormRenderContext).state.inputs[control.name]
        : param as DataFormInput;

    if (!hasField(input, 'value')) {
        return convertIn(control, control.value);
    }

    return input.value;
}

function createResult(controls: DataFormControl[], inputs: DataFormInputs): DataFormResult {
    let result: DataFormResult = {};

    controls.forEach(control => {
        if (!control.disabled) {
            let input = inputs[control.name];

            if (typeof input === 'undefined') {
                result[control.name] = convertOut(control,  { value: control.value });
            } else {
                result[control.name] = convertOut(control, input);
            }
        }
    });

    return result;
}

function validateAll(controls: DataFormControl[], inputs: DataFormInputs): DataFormErrors {
    let errors: DataFormErrors = {};

    controls.forEach(control => {
        if (!control.disabled) {
            let input = inputs[control.name];
            let value = resolveValue(control, input);
            let error = validate(control, value);

            if (error) {
                errors[control.name] = error;
            }
        }
    });

    return errors;
}

function resolveError(control: DataFormControl, context: DataFormRenderContext): string | null | undefined {

    if (control.disabled) {
        return undefined;
    }

    return tryField(context, `state.inputs.${control.name}.error`, undefined);
}

function hashToOptions(hash: {[name: string]: string }): {value: string, title: string}[] {
    return Object.keys(hash).map(key => ({ value: key, title: hash[key] }));
}

function renderText(control: DataFormControl, context: DataFormRenderContext): ReactElement {

    let error = resolveError(control, context);
    let value = resolveValue(control, context);

    if (typeof value === 'undefined' || value === null) {
        value = '';
    }

    return (<TextField autoComplete="off" name={control.name}
                       variant={tryField(control, 'extra.variant', 'standard')}
                       type={tryField(control, 'extra.type', 'input')}
                       multiline={tryField(control, 'extra.multiline', false)}
                       error={!!error}
                       label={control.label}
                       onChange={e => context.onChange(e.target.value)}
                       value={value}
                       disabled={control.disabled}
                       helperText={error}
                       fullWidth />);
}

function renderSelect(control: DataFormControl, context: DataFormRenderContext): ReactElement {

    const values = readField<{[key: string]: string}>(control, 'values');

    const error = resolveError(control, context);

    let value = resolveValue(control, context);

    if (typeof value === 'undefined' || value === null) {
        value = '';
    }

    return (<FormControl fullWidth error={!!error}>
        <InputLabel>{control.label}</InputLabel>
        <Select name={control.name}
                fullWidth
                onChange={e => context.onChange(e.target.value)}
                value={value}
                disabled={control.disabled}>
            {Object.keys(values).map((key, i) => {
                return (<MenuItem key={i} value={key}>{values[key]}</MenuItem>)
            })}
        </Select>
        {error && (<FormHelperText>{error}</FormHelperText>)}
    </FormControl>);
}

function renderAutocomplete(control: DataFormControl, context: DataFormRenderContext): ReactElement {
    const isMultiple = !!control.extra?.multiple;

    const originalValues = control.values!;
    const availableValues = hashToOptions(originalValues);
    
    const error = resolveError(control, context);

    let providedValues = resolveValue(control, context);

    if (isMultiple) {
        providedValues = (providedValues || []).map((value: string) => ({ value, title: originalValues[value]}));
    } else {
        providedValues = providedValues ? {  value: providedValues, title:  originalValues[providedValues]} : null;
    }

    return (<FormControl fullWidth error={!!error}><Autocomplete 
        disabled={control.disabled}
        multiple={control.extra?.multiple}
        options={availableValues}
        getOptionLabel={(option) => option.title}
        onChange={(e: any, selectedOptions: any) => {
            if (isMultiple) {
                const values = (selectedOptions || []).map((o: any) => o.value);

                context.onChange(values);
            } else {
                context.onChange((selectedOptions || {}).value);
            }
        }}
        value={providedValues}
        getOptionSelected={(option, againstOption) => option.value === againstOption.value}
        filterSelectedOptions
        renderInput={(params) => (
          <TextField
            {...params}
            error={!!error}
            variant="standard"
            label={control.label}
          />
        )} />
        {error && (<FormHelperText>{error}</FormHelperText>)}
        </FormControl>);
}

function renderRadio(control: DataFormControl, context: DataFormRenderContext): ReactElement {
    
    const values = control.values!;

    const error = resolveError(control, context);

    const value = resolveValue(control, context);
    
    return (<FormControl component="fieldset">
        <FormLabel component="legend">{control.label}</FormLabel>
        <Box mb={1}/>
        <RadioGroup name={control.name} 
                    onChange={e => context.onChange(e.target.value)} >
            {Object.keys(values).map((key, i) => {
                return (<FormControlLabel key={i} 
                    value={key} 
                    control={<Radio checked={value === key} />} 
                    label={values[key]} 
                    disabled={control.disabled} />)
            })}
        </RadioGroup>
        {error && (<FormHelperText>{error}</FormHelperText>)}
    </FormControl>)
}


function renderCheckbox(control: DataFormControl, context: DataFormRenderContext): ReactElement {

    let error = resolveError(control, context);

    let value = resolveValue(control, context);

    if (typeof value === 'undefined' || value === null) {
        value = false;
    }

    return (
        <FormControl fullWidth error={!!error}>
            <FormControlLabel control={
            <Checkbox checked={value}
                      disabled={control.disabled}
                      onChange={e => context.onChange(e.target.checked)}
                      name={control.name}
                      color="primary" />}
                              label={control.label} />
            {error && (<FormHelperText>{error}</FormHelperText>)}
        </FormControl>);
}

function renderDate(control: DataFormControl, context: DataFormRenderContext): ReactElement {
    let value = resolveValue(control, context);
    let error = resolveError(control, context);

    if (typeof value === 'undefined' || value === null) {
        value = null;
    }

    const constraint = control.extra.constraint || undefined;
    const onlyFuture = constraint === 'only-future';
    const onlyPast = constraint === 'only-past';

    return (<MuiPickersUtilsProvider utils={MomentUtils}>
        <DatePicker
            error={!!error}
            fullWidth
            disabled={control.disabled}
            margin="normal"
            disableFuture={onlyPast}
            disablePast={onlyFuture}
            label={control.label}
            format="DD/MM/YYYY"
            value={value}
            onChange={e => {
                context.onChange(e);
            }}
            helperText={error}
      />
    </MuiPickersUtilsProvider>);
}

function validate(control: DataFormControl, value: any): string | null | undefined {
    if (isBlank(value)) {
        let required = control.required;

        if (required) {
            let message = required;

            if (typeof message !== 'string') {
                message = 'It\'s required!'
            }

            return message;
        }

        return null;
    }

    return (control.validate || (() => null))(value);
}

function uselessForConvert(value: any): boolean {
    return typeof value === 'undefined' || value === null 
        || (typeof value === 'string' && value.trim().length === 0);
}

function convertIn(control: DataFormControl, value: any): any {

    if (uselessForConvert(value)) {
        return control.uselessIn;
    }

    if (control.convertIn) {
        return control.convertIn(value);
    }

    return value;
}

function convertOut(control: DataFormControl, {value, error}: DataFormInput): any {

    if (error) {
        return value;
    }

    if (uselessForConvert(value)) {
        return control.uselessOut;
    }

    if (control.convertOut) {
        value = control.convertOut(value);
    }

    return value;
}

function assignErrors(errors: {[name: string]: string}, inputs: DataFormInputs) {
    Object.keys(errors).forEach(field => {
        let error = errors[field];

        let input = inputs[field] || { value: undefined };

        if (!input.error) {
            input.error = error;
        }

        inputs[field] = input;
    });

    return inputs;
}

function disabledControlNames(controls: DataFormControl[]): string[] {
    return controls.filter(c => c.disabled).map(c => c.name);
}

function lostControlNames(controls: DataFormControl[], inputs: DataFormInputs): string[] {
    let lostKeys = [];
    let currentKeys = controls.map(c => c.name);

    for (let key in inputs) {
        if (!currentKeys.includes(key)) {
            lostKeys.push(key);
        }
    }

    return lostKeys;
}

class DataForm extends Component<DataFormProps, DataFormState> {

    private renderers: {[name: string]: DataFormControlRenderer} = {
        'text': renderText,
        'select': renderSelect,
        'autocomplete': renderAutocomplete,
        'checkbox': renderCheckbox,
        'radio': renderRadio,
        'date': renderDate
    };

    private scheduledTasks: (() => void)[] = [];

    constructor(props: DataFormProps) {
        super(props);

        this.state = {
            inputs: {}
        };

        if (this.props.onReady) {
            this.props.onReady(() => {

                let errors = validateAll(this.props.controls, this.state.inputs);

                let result = null;

                if (objectEmpty(errors)) {
                    result = createResult(this.props.controls, this.state.inputs);

                    if (this.props.onValidate) {
                        errors = cloneExcept(this.props.onValidate(result), ...disabledControlNames(this.props.controls));
                    }
                }

                if (!objectEmpty(errors)) {
                    let inputs = clone(this.state.inputs);

                    assignErrors(errors, inputs);

                    this.setState({ inputs });

                    if (this.props.onError) {
                        this.props.onError(true);
                    }

                    result = null;
                }

                return result;
            });
        }
    }

    componentDidUpdate(prevProps: DataFormProps) {

        // assigned external errors
        if (this.props.errors !== prevProps.errors) {
            let errors = this.props.errors || {};

            let disabledControls = disabledControlNames(this.props.controls);
            let lostControls = lostControlNames(this.props.controls, this.state.inputs);

            errors = cloneExcept(errors, ...disabledControls, ...lostControls);

            let inputs = cloneExcept(this.state.inputs, ...lostControls);

            if (!objectEmpty(errors)) {
                assignErrors(errors, inputs);
                this.setState({ inputs });
            }

            if (this.props.onError) {
                this.props.onError(hasError(inputs, this.props.controls));
            }
        }

        // remove inputs for disabled and inexistent controls
        if (this.props.controls !== prevProps.controls) {

            let disabledControls = disabledControlNames(this.props.controls);
            let lostControls = lostControlNames(this.props.controls, this.state.inputs);

            const inputs = cloneExcept(this.state.inputs, ...disabledControls, ...lostControls);

            this.setState({
                inputs
            });

            // in case if some inputs with errors are gone
            if (this.props.onError) {
                this.props.onError(hasError(inputs, this.props.controls));
            }
        }

        // run scheduled tasks
        this.scheduledTasks.forEach(task => task());

        this.scheduledTasks = [];

        let oldFresh = tryField(prevProps, 'fresh', true);
        let newFresh = tryField(this.props, 'fresh', true);

        if (newFresh && oldFresh !== newFresh) {
            this.setState({ inputs: {} });
        }
    }

    render() {
        const {
            controls,
            className,
            autoComplete,
            children
        } = this.props;

        let layout = this.props.layout;

        if (!layout) {
            layout = renderers => {
                return (<Fragment>
                    {controls.map((control, i) => {
                        return (<Fragment key={i}>
                            { renderers[control.name]() }
                            { i < controls.length - 1 ? ( <Box m={2} />) : '' }
                        </Fragment>);
                    })}
                </Fragment>);
            }
        }

        const renderers: {[name: string]: () => ReactElement} = {};

        controls.forEach(control => {
            renderers[control.name] = () => {
                let renderer = readField<DataFormControlRenderer>(this.renderers, control.type);
                return renderer(control, this.createRenderContext(control));
            }
        });
        
        return (<form noValidate autoComplete={autoComplete} className={className}>
            { layout(renderers) }
            {children}
        </form>);
    }

    private createRenderContext(control: DataFormControl): DataFormRenderContext {
        return {
            onChange: value => {
                let error = validate(control, value);

                let input = { value, error };

                if (control.onInput) {
                    control.onInput(convertOut(control, input));
                }

                this.setState({
                    inputs: cloneWith(this.state.inputs, {
                        [control.name]: input
                    })
                });

                if (this.props.onTouch) {
                    this.props.onTouch();
                }

                this.scheduledTasks.push(() => {
                    if (this.props.onError) {

                        let lostControls = lostControlNames(this.props.controls, this.state.inputs);

                        let inputs = cloneExcept(this.state.inputs, ...lostControls);

                        // we need to check errors after controls up to date
                        this.props.onError(hasError(inputs, this.props.controls));
                    }
                });
            },
            state: this.state
        }
    }
}

export default DataForm;